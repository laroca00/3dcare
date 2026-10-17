/**
 * 3D Care visitor statistics.
 *
 * A Google Apps Script web app that receives one small record per page view
 * from the website and appends it to this spreadsheet. No cookies, no IP
 * addresses and no personal data are stored.
 *
 * Setup: see analytics/README.md.
 */

const VISITS_SHEET = "Visits";
const SUMMARY_SHEET = "Summary";
const HEADERS = ["Time (UTC)", "Month", "Path", "Language", "Referrer", "Device", "Screen", "New session"];

const ALLOWED_DEVICES = ["mobile", "tablet", "desktop"];
const MAX_FIELD = 200;

/** Run once from the editor to create the sheets and the summary. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let visits = ss.getSheetByName(VISITS_SHEET);
  if (!visits) visits = ss.insertSheet(VISITS_SHEET);
  visits.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  visits.setFrozenRows(1);

  let summary = ss.getSheetByName(SUMMARY_SHEET);
  if (!summary) summary = ss.insertSheet(SUMMARY_SHEET, 0);
  summary.clear();
  const v = VISITS_SHEET;
  summary.getRange("A1").setValue("Page views and sessions per month").setFontWeight("bold");
  summary.getRange("A2").setFormula(
    `=QUERY(${v}!A:H, "select B, count(C), sum(H) where C is not null group by B order by B desc label B 'Month', count(C) 'Page views', sum(H) 'Sessions'", 1)`
  );
  summary.getRange("E1").setValue("Most visited pages").setFontWeight("bold");
  summary.getRange("E2").setFormula(
    `=QUERY(${v}!A:H, "select C, count(C) where C is not null group by C order by count(C) desc limit 25 label C 'Page', count(C) 'Views'", 1)`
  );
  summary.getRange("H1").setValue("Where visitors come from").setFontWeight("bold");
  summary.getRange("H2").setFormula(
    `=QUERY(${v}!A:H, "select E, count(E) where E is not null and H = 1 group by E order by count(E) desc limit 25 label E 'Referrer', count(E) 'Sessions'", 1)`
  );
  summary.getRange("K1").setValue("Devices and languages").setFontWeight("bold");
  summary.getRange("K2").setFormula(
    `=QUERY(${v}!A:H, "select F, D, count(C) where C is not null group by F, D order by count(C) desc label F 'Device', D 'Language', count(C) 'Page views'", 1)`
  );
}

/** Receives a page view from the website. */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const path = clean(data.path);
    // Only accept views of this site's pages.
    if (!/^\/(en|tr)(\/|$)/.test(path)) return ok();

    const now = new Date();
    const row = [
      now,
      Utilities.formatDate(now, "UTC", "yyyy-MM"),
      path,
      path.slice(1, 3),
      clean(data.referrer) || (data.newSession === true ? "(direct)" : "(internal)"),
      ALLOWED_DEVICES.indexOf(data.device) >= 0 ? data.device : "unknown",
      clean(data.screen),
      data.newSession === true ? 1 : 0,
    ];
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VISITS_SHEET).appendRow(row);
  } catch (err) {
    // Malformed requests are ignored.
  }
  return ok();
}

function clean(value) {
  return String(value || "").replace(/[\r\n\t]/g, " ").slice(0, MAX_FIELD);
}

function ok() {
  return ContentService.createTextOutput("ok");
}
