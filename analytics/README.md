# Visitor statistics

The website counts visits without cookies or personal data. Records are sent
to a Google Apps Script web app (`Code.gs`) that appends rows to a Google
Sheet owned by the project:

- `Dashboard`: key figures for this month and since launch, with charts.
- `Reports`: the tables behind the charts (months, pages, countries,
  referrers, devices, browsers, campaigns, downloads, outbound links, time on
  page).
- `Visits`: one row per page view: time, page path, language, referring
  website (host only), device type, screen size, whether it is the first page
  of a browser session, country (estimated from the browser's time zone and
  language; no IP address is used), browser and OS family, and the
  `utm_source`, `utm_medium` and `utm_campaign` tags of the link.
- `Engagement`: one row when a page is left: seconds the page was visible and
  how far it was scrolled.
- `Events`: file downloads (`.stl`, `.3mf`, `.pdf`, ...) and clicks on links to
  other websites.

To see where visitors come from, add campaign tags to links you share, for
example `https://3dcare.eu/en/?utm_source=newsletter&utm_campaign=kickoff`.

## Setup

1. Create a new Google Sheet, for example "3D Care website statistics".
2. Open **Extensions → Apps Script**, replace the editor contents with
   `Code.gs` and save.
3. Select the `setup` function and click **Run**. Approve the permission
   request; the script only needs access to this spreadsheet.
4. Click **Deploy → New deployment**, choose **Web app**, set
   *Execute as* to **Me** and *Who has access* to **Anyone**, then **Deploy**.
5. Copy the web app URL (it ends in `/exec`) and save it as the repository
   variable `STATS_URL`:

   ```bash
   gh variable set STATS_URL --body "https://script.google.com/macros/s/.../exec"
   ```

6. Re-run the **Deploy website** workflow. Statistics start with the next visit.

After changing `Code.gs`, run `setup` again (it keeps the data and rebuilds
the dashboard), then use **Deploy → Manage deployments → Edit → New version**
so the URL stays the same.

If no rows appear, check **Executions** in the Apps Script editor: the web app
always answers "ok", errors are only logged there.
