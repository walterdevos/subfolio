# Subfolio

A responsive, single-page subscription manager built with plain HTML, CSS, and JavaScript. It starts with the 29 entries transcribed from `sheet.jpeg`.

## Open the app

When this directory is served by your web server, visit **`/subscription_manager/`**. No build or dependency installation is required.

For a standalone local preview, run from this directory:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open **http://localhost:8080**. Use an HTTP server rather than opening `index.html` directly, since the JavaScript uses ES modules.

## Features

- Monthly and yearly plan totals, monthly equivalent, and annualized spending.
- Search across names, accounts, notes, payment details, and categories; status/category filters and sorting.
- Add, edit, and delete subscriptions, with an immediate undo option for deletion.
- Track prices, billing dates, payment method, last four digits, account details, links, and notes.
- Independent active status and cancellation tracking, including a planned cancellation and end date.
- Upcoming renewal view and a 30-day payment forecast, including short-month double renewals.
- Automatic local storage, cross-tab updates, and validated JSON backup import/export.
- Responsive mobile layout, keyboard-accessible dialogs, and `/` to focus search.

## Data and calculations

The screenshot's active column determines which entries count toward spending. The initial active monthly total is **€124.95**; the yearly total is **€445.99**. The screenshot's €376.00 yearly sum omits the active €69.99 eDreams subscription. Monthly equivalent is **€162.12**, and annualized spending is **€1,945.39**.

Cancellation requests do not automatically change the active flag. To remove a plan from spending totals, edit it and uncheck **Active subscription**. Renewal dates on or after an entered end date are excluded from upcoming payments. Annualized spending is a run-rate estimate of current active plans, not a forecast adjusted for future cancellations.

Renewals roll forward from the recorded payment date (or billing start when no payment date exists), retaining the original billing day across short months and leap years. The upcoming view lists one next renewal per active plan. The 30-day sidebar includes all payments within that window.

Ambiguous dates from the sheet are preserved in notes, and OpenCode Zen's missing price remains unknown rather than zero. Categories were assigned for organization. Original account information and cancellation notes are editable; please review transcribed details.

Changes stay in **this browser and origin** under `subfolio.subscriptions.v1`. Export a JSON backup to transfer them to another browser/device or before clearing browser storage. Import replaces the current workspace after confirmation. An empty imported list stays empty on reload. If local storage is unavailable, the app shows a session-only warning; if stored data is unreadable, it is preserved for recovery export.

The app uses Google Fonts with system-font fallbacks; all application functionality works without that font request. There is no backend, account login, bank connection, automatic provider cancellation, or external reminder service.

## Tests

With Node.js 18 or newer:

```sh
npm test
```

The dependency-free model tests cover source totals, month-end and leap-year recurrence, cancellation boundaries, forecasts, backup round-trips, and invalid input.
# subfolio
