/**
 * 3D Care visitor statistics.
 *
 * A Google Apps Script web app that receives small anonymous records from the
 * website (page views, time on page, downloads and outbound clicks) and
 * appends them to this spreadsheet. No cookies, no IP addresses and no
 * personal data are stored.
 *
 * Setup: see analytics/README.md.
 */

const SHEETS = {
  visits: {
    name: "Visits",
    headers: ["Time", "Month", "Path", "Language", "Referrer", "Device", "Screen", "New session",
      "Country", "Browser", "OS", "Source", "Medium", "Campaign"],
    widths: [130, 70, 220, 70, 160, 70, 90, 90, 120, 110, 80, 110, 90, 140],
  },
  engagement: {
    name: "Engagement",
    headers: ["Time", "Month", "Path", "Seconds", "Scroll %"],
    widths: [130, 70, 220, 70, 70],
  },
  events: {
    name: "Events",
    headers: ["Time", "Month", "Type", "Target", "Page"],
    widths: [130, 70, 90, 320, 220],
  },
};
const DASHBOARD_SHEET = "Dashboard";
const REPORTS_SHEET = "Reports";
const OLD_SUMMARY_SHEET = "Summary";

const COLORS = {
  ink: "#15232B",
  muted: "#5A6B72",
  paper: "#F5F7F6",
  plate: "#DCE3E0",
  grid: "#E6EBE9",
  series: ["#008A78", "#5B3FA8"],
};

const ALLOWED_DEVICES = ["mobile", "tablet", "desktop"];
const ALLOWED_BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Opera", "Samsung Internet", "Other"];
const ALLOWED_OS = ["Windows", "macOS", "iOS", "Android", "Linux", "ChromeOS", "Other"];
const MAX_FIELD = 200;
const MAX_SECONDS = 3600;

// Country is estimated from the browser's time zone, then from its language.
const TIME_ZONE_COUNTRY = {
  "Europe/Istanbul": "TR", "Asia/Istanbul": "TR",
  "Europe/Belgrade": "RS", "Europe/Zagreb": "HR", "Europe/Riga": "LV", "Europe/Malta": "MT",
  "Europe/Vilnius": "LT", "Europe/Amsterdam": "NL", "Europe/Andorra": "AD", "Europe/Athens": "GR",
  "Europe/Berlin": "DE", "Europe/Bratislava": "SK", "Europe/Brussels": "BE", "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU", "Europe/Chisinau": "MD", "Europe/Copenhagen": "DK", "Europe/Dublin": "IE",
  "Europe/Helsinki": "FI", "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Lisbon": "PT",
  "Atlantic/Azores": "PT", "Atlantic/Madeira": "PT", "Europe/Ljubljana": "SI", "Europe/London": "GB",
  "Europe/Luxembourg": "LU", "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Europe/Minsk": "BY",
  "Europe/Moscow": "RU", "Europe/Oslo": "NO", "Europe/Paris": "FR", "Europe/Podgorica": "ME",
  "Europe/Prague": "CZ", "Europe/Rome": "IT", "Europe/Sarajevo": "BA", "Europe/Skopje": "MK",
  "Europe/Sofia": "BG", "Europe/Stockholm": "SE", "Europe/Tallinn": "EE", "Europe/Tirane": "AL",
  "Europe/Vienna": "AT", "Europe/Warsaw": "PL", "Europe/Zurich": "CH", "Atlantic/Reykjavik": "IS",
  "Asia/Nicosia": "CY", "Europe/Nicosia": "CY", "Asia/Famagusta": "CY",
};
const COUNTRY_NAMES = {
  TR: "Türkiye", RS: "Serbia", HR: "Croatia", LV: "Latvia", MT: "Malta", LT: "Lithuania",
  NL: "Netherlands", AD: "Andorra", GR: "Greece", DE: "Germany", SK: "Slovakia", BE: "Belgium",
  RO: "Romania", HU: "Hungary", MD: "Moldova", DK: "Denmark", IE: "Ireland", FI: "Finland",
  UA: "Ukraine", PT: "Portugal", SI: "Slovenia", GB: "United Kingdom", LU: "Luxembourg",
  ES: "Spain", BY: "Belarus", RU: "Russia", NO: "Norway", FR: "France", ME: "Montenegro",
  CZ: "Czechia", IT: "Italy", BA: "Bosnia and Herzegovina", MK: "North Macedonia", BG: "Bulgaria",
  SE: "Sweden", EE: "Estonia", AL: "Albania", AT: "Austria", PL: "Poland", CH: "Switzerland",
  IS: "Iceland", CY: "Cyprus", US: "United States", CA: "Canada", AU: "Australia",
};

// Formula argument separator: "," or ";" depending on the spreadsheet locale.
let separator = ",";

/** Run from the editor to create or refresh the sheets, reports and dashboard. Data is kept. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach((key) => setupDataSheet(ss, SHEETS[key]));
  separator = detectSeparator(ss);

  const old = ss.getSheetByName(OLD_SUMMARY_SHEET);
  if (old) ss.deleteSheet(old);

  const reports = resetSheet(ss, REPORTS_SHEET, 0);
  const blocks = setupReports(reports);
  const dashboard = resetSheet(ss, DASHBOARD_SHEET, 0);
  setupDashboard(dashboard, reports, blocks);
  ss.setActiveSheet(dashboard);
}

function setupDataSheet(ss, def) {
  let sheet = ss.getSheetByName(def.name);
  if (!sheet) sheet = ss.insertSheet(def.name);
  sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers])
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground(COLORS.ink);
  sheet.setFrozenRows(1);
  def.widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  sheet.getRange("A2:A").setNumberFormat("yyyy-mm-dd hh:mm");
  sheet.getRange("B2:B").setNumberFormat("yyyy-mm");
}

function detectSeparator(ss) {
  const scratch = ss.insertSheet();
  scratch.getRange("A1").setFormula("=SUM(1,2)");
  SpreadsheetApp.flush();
  const comma = scratch.getRange("A1").getValue() === 3;
  ss.deleteSheet(scratch);
  return comma ? "," : ";";
}

/** Formulas are written with commas; this swaps them outside of quoted text if needed. */
function localize(formula) {
  if (separator === ",") return formula;
  return formula.replace(/("[^"]*")|,/g, (match, quoted) => quoted || separator);
}

function resetSheet(ss, name, index) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name, index);
  sheet.getCharts().forEach((c) => sheet.removeChart(c));
  sheet.clear();
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(index + 1);
  return sheet;
}

/** Report tables built with QUERY. Each block is placed side by side on the Reports sheet. */
function setupReports(sheet) {
  const v = SHEETS.visits.name;
  const g = SHEETS.engagement.name;
  const e = SHEETS.events.name;
  const blocks = {
    monthly: ["Page views and sessions per month", 3, `=QUERY(${v}!A:N, "select B, count(C), sum(H) where C is not null group by B order by B label B 'Month', count(C) 'Page views', sum(H) 'Sessions'", 1)`],
    pages: ["Most visited pages", 2, `=QUERY(${v}!A:N, "select C, count(C) where C is not null group by C order by count(C) desc limit 15 label C 'Page', count(C) 'Page views'", 1)`],
    countries: ["Countries (sessions)", 2, `=QUERY(${v}!A:N, "select I, sum(H) where I is not null and H = 1 group by I order by sum(H) desc limit 15 label I 'Country', sum(H) 'Sessions'", 1)`],
    referrers: ["Where visitors come from (sessions)", 2, `=QUERY(${v}!A:N, "select E, count(E) where E is not null and H = 1 group by E order by count(E) desc limit 15 label E 'Referrer', count(E) 'Sessions'", 1)`],
    devices: ["Devices", 2, `=QUERY(${v}!A:N, "select F, count(C) where C is not null group by F order by count(C) desc label F 'Device', count(C) 'Page views'", 1)`],
    browsers: ["Browsers", 2, `=QUERY(${v}!A:N, "select J, count(C) where J is not null group by J order by count(C) desc label J 'Browser', count(C) 'Page views'", 1)`],
    systems: ["Operating systems", 2, `=QUERY(${v}!A:N, "select K, count(C) where K is not null group by K order by count(C) desc label K 'OS', count(C) 'Page views'", 1)`],
    campaigns: ["Campaigns (utm links)", 3, `=QUERY(${v}!A:N, "select L, N, sum(H) where L is not null group by L, N order by sum(H) desc limit 15 label L 'Source', N 'Campaign', sum(H) 'Sessions'", 1)`],
    downloads: ["Downloads", 2, `=QUERY(${e}!A:E, "select D, count(D) where C = 'download' group by D order by count(D) desc limit 15 label D 'File', count(D) 'Downloads'", 1)`],
    outbound: ["Links to other websites", 2, `=QUERY(${e}!A:E, "select D, count(D) where C = 'outbound' group by D order by count(D) desc limit 15 label D 'Link', count(D) 'Clicks'", 1)`],
    engagement: ["Time on page", 4, `=QUERY(${g}!A:E, "select C, count(C), avg(D), avg(E) where C is not null group by C order by count(C) desc limit 15 label C 'Page', count(C) 'Views measured', avg(D) 'Avg. seconds', avg(E) 'Avg. scroll %'", 1)`],
  };

  const needed = Object.keys(blocks).reduce((sum, key) => sum + blocks[key][1] + 1, 0);
  if (sheet.getMaxColumns() < needed) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), needed - sheet.getMaxColumns());
  }

  let col = 1;
  Object.keys(blocks).forEach((key) => {
    const [title, width, formula] = blocks[key];
    sheet.getRange(1, col).setValue(title).setFontWeight("bold").setFontColor(COLORS.ink);
    sheet.getRange(2, col).setFormula(localize(formula));
    sheet.getRange(2, col, 1, width).setFontWeight("bold").setBackground(COLORS.paper);
    sheet.setColumnWidth(col, 200);
    sheet.setColumnWidth(col + width, 24);
    blocks[key] = { col, width };
    col += width + 1;
  });
  sheet.getRange(3, blocks.monthly.col, 60, 1).setNumberFormat("yyyy-mm");
  sheet.getRange(3, blocks.engagement.col + 2, 60, 2).setNumberFormat("0");
  sheet.setFrozenRows(2);
  return blocks;
}

function setupDashboard(sheet, reports, blocks) {
  const v = SHEETS.visits.name;
  const g = SHEETS.engagement.name;
  const e = SHEETS.events.name;
  const thisMonth = "EOMONTH(TODAY(),-1)+1";

  sheet.setHiddenGridlines(true);
  sheet.getRange("A:I").setFontFamily("Inter").setVerticalAlignment("middle");
  sheet.setColumnWidth(1, 20);
  [2, 4, 6, 8].forEach((c) => sheet.setColumnWidth(c, 220));
  [3, 5, 7].forEach((c) => sheet.setColumnWidth(c, 20));

  sheet.getRange("B1").setValue("3D Care website statistics")
    .setFontSize(20).setFontWeight("bold").setFontColor(COLORS.ink);
  sheet.getRange("B2").setValue("Updated live. No cookies and no personal data. Raw data: Visits, Engagement, Events. Tables: Reports.")
    .setFontColor(COLORS.muted);
  sheet.setRowHeight(1, 44);

  const tiles = [
    [4, "This month", [
      ["Page views", `=COUNTIF(${v}!B2:B, ${thisMonth})`, "#,##0"],
      ["Sessions", `=SUMIF(${v}!B2:B, ${thisMonth}, ${v}!H2:H)`, "#,##0"],
      ["Downloads", `=COUNTIFS(${e}!B2:B, ${thisMonth}, ${e}!C2:C, "download")`, "#,##0"],
      ["Avg. time on page", `=IFERROR(AVERAGEIF(${g}!B2:B, ${thisMonth}, ${g}!D2:D), 0)`, '0" s"'],
    ]],
    [8, "Since launch", [
      ["Page views", `=COUNTA(${v}!C2:C)`, "#,##0"],
      ["Sessions", `=SUM(${v}!H2:H)`, "#,##0"],
      ["Downloads", `=COUNTIF(${e}!C2:C, "download")`, "#,##0"],
      ["Countries", `=IFERROR(ROWS(UNIQUE(FILTER(${v}!I2:I, ${v}!I2:I <> ""))), 0)`, "0"],
    ]],
  ];
  tiles.forEach(([row, heading, items]) => {
    sheet.getRange(row - 1, 2).setValue(heading).setFontWeight("bold").setFontColor(COLORS.ink);
    items.forEach(([label, formula, format], i) => {
      const col = 2 + i * 2;
      sheet.getRange(row, col).setValue(label).setFontColor(COLORS.muted).setFontSize(10);
      sheet.getRange(row + 1, col).setFormula(localize(formula)).setNumberFormat(format)
        .setFontSize(24).setFontWeight("bold").setFontColor(COLORS.ink).setHorizontalAlignment("left");
      sheet.getRange(row, col, 2, 1).setBackground(COLORS.paper)
        .setBorder(true, true, true, true, false, false, COLORS.plate, SpreadsheetApp.BorderStyle.SOLID);
    });
    sheet.setRowHeight(row + 1, 44);
  });

  // Report range for a block: header row plus 15 data rows.
  const range = (key, rows) => {
    const b = blocks[key];
    return reports.getRange(2, b.col, (rows || 16), b.width);
  };
  const base = (title) => ({
    title,
    titleTextStyle: { color: COLORS.ink, fontSize: 13, bold: true },
    legend: { position: "none" },
    colors: [COLORS.series[0]],
    backgroundColor: "#FFFFFF",
    hAxis: { gridlines: { color: COLORS.grid }, textStyle: { color: COLORS.muted } },
    vAxis: { gridlines: { color: COLORS.grid }, textStyle: { color: COLORS.muted } },
  });
  const add = (type, ranges, options, row, col, width) => {
    const builder = sheet.newChart().setChartType(type).setNumHeaders(1)
      .setPosition(row, col, 0, 0).setOption("width", width).setOption("height", 300);
    ranges.forEach((r) => builder.addRange(r));
    Object.keys(options).forEach((k) => builder.setOption(k, options[k]));
    sheet.insertChart(builder.build());
  };

  const monthly = base("Page views and sessions per month");
  monthly.legend = { position: "top", textStyle: { color: COLORS.muted } };
  monthly.colors = COLORS.series;
  monthly.lineWidth = 2;
  monthly.pointSize = 6;
  add(Charts.ChartType.LINE, [range("monthly", 40)], monthly, 11, 2, 940);

  const bar = Charts.ChartType.BAR;
  add(bar, [range("pages")], base("Most visited pages"), 27, 2, 460);
  add(bar, [range("countries")], base("Countries (sessions)"), 27, 6, 460);
  add(bar, [range("referrers")], base("Where visitors come from"), 43, 2, 460);
  add(bar, [range("downloads")], base("Downloads"), 43, 6, 460);
  add(bar, [range("devices", 4)], base("Devices"), 59, 2, 460);
  add(bar, [range("browsers", 8)], base("Browsers"), 59, 6, 460);
}

/** Receives a record from the website. */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const path = clean(data.path);
    // Only accept records about this site's pages.
    if (!/^\/(en|tr)(\/|$)/.test(path)) return ok();

    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    let def, row;

    if (data.type === "engagement") {
      def = SHEETS.engagement;
      row = [
        now, month, path,
        clamp(data.seconds, MAX_SECONDS),
        clamp(data.scroll, 100),
      ];
    } else if (data.type === "event") {
      if (data.kind !== "download" && data.kind !== "outbound") return ok();
      def = SHEETS.events;
      row = [now, month, data.kind, clean(data.target), path];
    } else {
      def = SHEETS.visits;
      row = [
        now, month, path,
        path.slice(1, 3),
        clean(data.referrer) || (data.newSession === true ? "(direct)" : "(internal)"),
        oneOf(data.device, ALLOWED_DEVICES, "unknown"),
        clean(data.screen),
        data.newSession === true ? 1 : 0,
        country(data.timeZone, data.language),
        oneOf(data.browser, ALLOWED_BROWSERS, ""),
        oneOf(data.os, ALLOWED_OS, ""),
        clean(data.source).toLowerCase(),
        clean(data.medium).toLowerCase(),
        clean(data.campaign).toLowerCase(),
      ];
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.name);
    sheet.appendRow(row);
    // Writing a date replaces the column's number format, so set it again.
    sheet.getRange(sheet.getLastRow(), 1, 1, 2).setNumberFormats([["yyyy-mm-dd hh:mm", "yyyy-mm"]]);
  } catch (err) {
    // Shown under Executions in the Apps Script editor.
    console.error(err);
  }
  return ok();
}

function country(timeZone, language) {
  let code = TIME_ZONE_COUNTRY[clean(timeZone)];
  if (!code) {
    const region = /^[a-z]{2,3}-([A-Z]{2})$/.exec(clean(language));
    code = region ? region[1] : "";
  }
  if (!code) return "Unknown";
  return COUNTRY_NAMES[code] || code;
}

function clean(value) {
  return String(value || "").replace(/[\r\n\t]/g, " ").slice(0, MAX_FIELD);
}

function clamp(value, max) {
  const n = Math.round(Number(value));
  return isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
}

function oneOf(value, allowed, fallback) {
  return allowed.indexOf(value) >= 0 ? value : fallback;
}

function ok() {
  return ContentService.createTextOutput("ok");
}
