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
