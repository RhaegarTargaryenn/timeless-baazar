# The Google Sheet, and how order status reaches it

The shop reads their orders off a Google Sheet, and that habit stays. The sheet
is a **mirror of MongoDB, never the other way round** — nothing in the app has
read from it since Phase 4.

Two things write to it, both from `backend/src/services/sheets.js`, both
fire-and-forget so neither a slow Apps Script nor a Google outage can make a
customer's checkout or the shop's "Mark done" hang:

| When | Function | Effect on the sheet |
|---|---|---|
| An order is placed | `syncOrderToSheet` | a new row, and the shop's notification email |
| The shop completes / cancels / reopens it | `syncOrderStatusToSheet` | the **same row**, updated in place |

Both post the identical full-row payload from `toSheetRow`. What makes the
second one an update rather than a duplicate lives in the Apps Script, below.

---

## Why the Apps Script had to change

The script that was deployed appends on every POST:

```js
sheet.appendRow([ data['Order ID'], ... ]);   // unconditional
```

So re-posting an order to update its status would have added a **second row for
the same order** — the exact opposite of the goal. The receiving end has to
upsert on `Order ID` before the backend's status sync is of any use.

**Until the script below is deployed, status changes will duplicate rows rather
than update them.** The backend half is live either way; this is the half that
lives in the client's Google account.

## What the new script does differently

1. **Upserts on `Order ID`.** Row found → update it. Not found → append, as
   before. This also closes a duplicate-row hole that existed already: a POST
   that reached Google but whose response was lost got retried into a second row.
2. **Maps by header name, not column position.** It reads row 1 and writes each
   value under its own heading, so the sheet's column order can be anything and
   columns can be added or reordered without touching the code. The old script
   hardcoded twelve positional indexes, and the backend has since grown to
   eighteen fields — `Email`, `City`, `State`, `Pincode`, `Subtotal`,
   `Discount`, `Coupon` — which those indexes never knew about.
3. **Leaves columns the payload does not mention alone.** If the shop keeps
   their own `Notes` column, a status update will not blank it.
4. **Emails on new orders only.** An update is silent — the shop is the one who
   made the change; mailing them about their own tap is noise, and the quota is
   100 mails a day.
5. **Takes a lock.** Two orders landing in the same second could otherwise both
   read "last row = 40" and write over each other.
6. **`doGet` is gone.** It served the old track-order-by-ID page, which read
   status out of the sheet. `OrderTracking.jsx` reads `/api/orders` now and
   nothing has called `doGet` since. It also carried the dead six-status map
   (`pending` / `confirmed` / `packed` / `out_for_delivery` / …) — this app has
   three statuses: `placed`, `completed`, `cancelled`.

---

## The script

Open the sheet → **Extensions → Apps Script**, replace everything, set
`NOTIFICATION_EMAIL`, save, then **Deploy → Manage deployments → edit →
Version: New version → Deploy**. The Web App URL does not change, so
`SHEETS_WEBAPP_URL` in `backend/.env` and in Render stays as it is.

```javascript
// Timeless Baazar — order sheet writer.
//
// The backend (backend/src/services/sheets.js) POSTs a whole order as a flat
// {header: value} object, both when the order is placed and every time the shop
// changes its status. This upserts on Order ID, so the second kind of post
// updates the order's existing row instead of adding another one.

const NOTIFICATION_EMAIL = "your-email@gmail.com"; // <-- CHANGE THIS
const ID_HEADER = "Order ID";

function doPost(e) {
  // Two orders can land in the same second. Without this they can both read the
  // same "last row" and write over each other.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    const headers = readOrCreateHeaders(sheet, data);
    const idColumn = headers.indexOf(ID_HEADER);
    if (idColumn === -1) {
      throw new Error('No "' + ID_HEADER + '" column in row 1');
    }

    const orderId = String(data[ID_HEADER]);
    const existingRow = findRowByOrderId(sheet, idColumn, orderId);

    if (existingRow) {
      // Update in place, cell by cell, so any column the sheet has that the
      // payload does not mention — the shop's own Notes, say — is preserved.
      headers.forEach(function (header, index) {
        if (header && Object.prototype.hasOwnProperty.call(data, header)) {
          sheet.getRange(existingRow, index + 1).setValue(data[header]);
        }
      });

      return json({ success: true, action: "updated", row: existingRow });
    }

    sheet.appendRow(headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(data, header) ? data[header] : "";
    }));

    // New orders only. A status change is the shop's own doing; mailing them
    // about their own tap is noise, and the quota is 100/day.
    sendOrderNotification(data);

    return json({ success: true, action: "appended" });

  } catch (error) {
    // The backend reads the HTTP status and records a failure on the order, so
    // returning 200-with-an-error would hide it. Throwing gives a real 500.
    Logger.log("doPost failed: " + error);
    throw error;

  } finally {
    lock.releaseLock();
  }
}

/** Row 1 as an array. Writes it from the payload's own keys if the sheet is empty. */
function readOrCreateHeaders(sheet, data) {
  if (sheet.getLastRow() === 0) {
    const keys = Object.keys(data);
    sheet.appendRow(keys);
    sheet.getRange(1, 1, 1, keys.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    return keys;
  }

  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (header) { return String(header).trim(); });
}

/** The sheet row number holding this order, or null. */
function findRowByOrderId(sheet, idColumn, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  // One read of the whole ID column, not one read per row.
  const ids = sheet.getRange(2, idColumn + 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === orderId) return i + 2; // +2: 1-based, skip header
  }
  return null;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendOrderNotification(data) {
  try {
    const subject = "New order: " + data["Order ID"] + " - Rs " + data["Total Amount"];

    const htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb">' +
        '<div style="background:#fff;border-radius:8px;padding:30px">' +
          '<h2 style="color:#53B175;margin-top:0">New order received</h2>' +

          '<div style="background:#f3f4f6;padding:15px;border-radius:6px;margin:20px 0">' +
            '<p style="margin:5px 0"><strong>Order ID:</strong> ' + data["Order ID"] + '</p>' +
            '<p style="margin:5px 0"><strong>Date:</strong> ' + data["Date"] + '</p>' +
            '<p style="margin:5px 0"><strong>Total:</strong> ' +
              '<span style="color:#53B175;font-size:18px;font-weight:bold">' +
              data["Total Amount"] + '</span></p>' +
            '<p style="margin:5px 0"><strong>Payment:</strong> ' + data["Payment"] + '</p>' +
          '</div>' +

          '<div style="background:#eff6ff;padding:15px;border-radius:6px;margin:20px 0">' +
            '<p style="margin:5px 0"><strong>Name:</strong> ' + data["Customer Name"] + '</p>' +
            '<p style="margin:5px 0"><strong>Phone:</strong> ' +
              '<a href="tel:' + data["Phone"] + '">' + data["Phone"] + '</a></p>' +
            '<p style="margin:5px 0"><strong>Address:</strong> ' + data["Address"] + '</p>' +
          '</div>' +

          '<div style="background:#fef3c7;padding:15px;border-radius:6px;margin:20px 0">' +
            '<h3 style="margin:0 0 10px 0">Items (' + data["Total Items"] + ')</h3>' +
            '<p style="margin:5px 0;white-space:pre-wrap">' + data["Items"] + '</p>' +
          '</div>' +

          '<p style="color:#6b7280;font-size:12px;margin-top:30px">' +
            'Mark this order done in the admin panel - the sheet updates itself.' +
          '</p>' +
        '</div>' +
      '</div>';

    MailApp.sendEmail({ to: NOTIFICATION_EMAIL, subject: subject, htmlBody: htmlBody });
  } catch (error) {
    // Never let a mail failure fail the write. The order matters; the email does not.
    Logger.log("Email failed: " + error);
  }
}
```

---

## The sheet's columns

`toSheetRow` emits these eighteen headings. The script matches on the text, so
**they must be spelled exactly like this in row 1** — order does not matter, and
extra columns of the shop's own are left untouched.

```
Order ID | Date | Customer Name | Email | Phone | Address | City | State |
Pincode | Items | Total Items | Subtotal | Discount | Total Amount | Coupon |
Payment | Status | Status Updated
```

`Status` is one of `placed`, `completed`, `cancelled`. `Status Updated` is new —
it is when the shop last moved the order, so a row that changed can be told from
one that has sat there since it was placed.

**A sheet still on the old twelve columns will work**, but only the headings it
shares with the list above get filled; `Landmark` and `Notes` are simply never
written by the backend. Adding the missing headings to row 1 is enough to start
capturing the rest — no code change.

## Editing Status by hand no longer does anything

It never reached the app, and now the app will overwrite it: the next status
change in the admin panel re-posts the whole row from the database. **The admin
panel is where an order is completed or cancelled**; the sheet is the record.

## When a sync fails

Nothing is lost — the order is already committed in MongoDB. The failure is
recorded on the order document:

- `sheetSynced` / `sheetSyncError` — did the order ever reach the sheet
- `sheetStatusSyncedAt` / `sheetStatusSyncError` — did its latest status change

`retryFailedSyncs()` in `sheets.js` re-posts everything with `sheetSynced:
false`. A failed *status* push deliberately does not set that flag: the row is in
the sheet, only its Status cell is stale, and the next change to that order
re-posts the whole row anyway.

Render's logs carry both, prefixed `[sheets]`.
