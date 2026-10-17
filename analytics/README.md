# Visitor statistics

The website counts page views without cookies or personal data. Each view is
sent to a Google Apps Script web app (`Code.gs`) that appends one row to a
Google Sheet owned by the project. The `Summary` sheet shows page views and
sessions per month, the most visited pages, referring websites, and devices
and languages.

Recorded per page view: time, page path, language, referring website (host
only), device type (mobile, tablet or desktop), screen size, and whether it is
the first page of a browser session.

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

After changing `Code.gs`, use **Deploy → Manage deployments → Edit → New
version** so the URL stays the same.
