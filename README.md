# Subfolio

A responsive, single-page subscription manager built with plain HTML, CSS, and JavaScript. When first opened in a new or cleared browser, it loads starter data from `initial-data.json`.

## Open the app

When this directory is served by your web server, visit **`/subscription_manager/`**. No build or dependency installation is required.

For a standalone local preview, run from this directory:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open **http://localhost:8080**. Use an HTTP server rather than opening `index.html` directly, since the JavaScript uses ES modules.

## Features

- **Overview dashboard**: Monthly and yearly plan totals, monthly equivalent, and annualized spending.
- **Dynamic avatars**: Subscription avatars derive their accent color, initials, and soft tint background directly from their category's color. No hardcoded brand lists.
- **Settings page (`#settings`)**:
  - Edit category names and assign custom colors with the built-in color picker.
  - Add new custom categories.
  - Delete unused categories or safely reassign existing subscriptions before deletion.
  - **Clear all data and start from scratch**: Empty the workspace with a single click to enter your subscriptions from a clean slate. Includes immediate Undo.
  - **Reload starter data**: Restore the sample subscriptions from `initial-data.json` whenever you want.
- **Search & filters**: Search by name, account, notes, payment details, or user ID; filter by active/inactive/cancelling status and category.
- **Subscription management**: Add, edit, and delete subscriptions with soft deletion undo.
- **Cancellations & renewals**: Track planned and requested cancellations, access end dates, and next renewal dates rolling forward correctly across month ends and leap years.
- **Upcoming forecast**: 30-day view of due renewals and category spending breakdown.
- **Local-first backup**: Automatic browser storage (`subfolio.subscriptions.v1` and `subfolio.categories.v1`), cross-tab synchronization, and full JSON backup export & import.

## Data and calculations

- `initial-data.json` contains the starter data loaded on first launch in a new or cleared browser.
- The **Active subscription** checkbox determines which entries count toward spending. Cancellation status is tracked independently.
- Renewals roll forward from the recorded payment date (or billing start), preserving billing days across short months and leap years.
- A blank amount is treated as an unknown price, not €0.
- `sheet.jpeg` is kept in this directory as reference for the original spreadsheet.

## Tests

With Node.js 18 or newer:

```sh
npm test
```

The model tests cover category validation, color normalization, initial data parsing, renewal calculations, daylight saving neutrality, forecasts, and backup round-trips.
