import config from '../config/env.js';
import Order from '../models/Order.js';

/**
 * Mirror an order into the client's Google Sheet.
 *
 * The browser used to do this with `fetch(..., { mode: 'no-cors' })`, which
 * cannot read the response. The old code logged "assumed success" and returned
 * true no matter what actually happened, so a broken Apps Script deployment
 * would have lost orders silently.
 *
 * From the server there is no CORS to work around: the real status is visible,
 * failures are retried, and the outcome is written back onto the order so a
 * failed sync can be found later instead of disappearing.
 *
 * **The receiving Apps Script upserts on `Order ID`.** Posting the same order
 * twice updates its row rather than adding a second one, which is what lets a
 * status change reuse this same path -- and it also closes a duplicate-row hole
 * in the retry below, where a POST that reached Google but whose response was
 * lost would previously be retried into a second row.
 */

const rupees = (paise) => Number((paise / 100).toFixed(2));

const formatAddress = (address) => {
  if (!address) return '';
  return [
    address.street,
    address.street2,
    address.village,
    address.city,
    address.state,
    address.zipCode,
  ]
    .filter(Boolean)
    .join(', ');
};

/** The column layout the client's existing sheet already expects. */
export const toSheetRow = (order) => ({
  'Order ID': order.orderNumber,
  Date: new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  'Customer Name': order.userName || 'Guest',
  Email: order.userEmail || '-',
  Phone: order.address?.phone || '-',
  Address: formatAddress(order.address),
  City: order.address?.city || '-',
  State: order.address?.state || '-',
  Pincode: order.address?.zipCode || '-',
  Items: order.items
    .map((item) => `${item.name} (${item.variantLabel}) x${item.quantity}`)
    .join(', '),
  'Total Items': order.items.reduce((sum, item) => sum + item.quantity, 0),
  Subtotal: rupees(order.subtotal),
  Discount: rupees(order.discount),
  'Total Amount': rupees(order.total),
  Coupon: order.coupon?.code || '-',
  Payment: order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod,
  Status: order.status,
  'Status Updated': new Date(order.updatedAt ?? Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  }),
});

const postOnce = async (row, timeoutMs = 10_000) => {
  const abort = AbortSignal.timeout(timeoutMs);

  const response = await fetch(config.sheetsWebappUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // what Apps Script accepts without a preflight
    body: JSON.stringify(row),
    signal: abort,
    redirect: 'follow', // Apps Script answers with a 302 to script.googleusercontent.com
  });

  if (!response.ok) {
    throw new Error(`Sheets responded ${response.status} ${response.statusText}`);
  }

  return response;
};

/** Post the row, retrying with a backoff. Throws the last error if none stick. */
const postWithRetry = async (row, attempts) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await postOnce(row);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      }
    }
  }

  throw lastError;
};

/**
 * Post a newly placed order, then record what happened on the order document
 * either way.
 */
export const syncOrderToSheet = async (order, { attempts = 3 } = {}) => {
  if (!config.sheetsWebappUrl) {
    console.warn('[sheets] SHEETS_WEBAPP_URL is not set — skipping');
    return false;
  }

  try {
    await postWithRetry(toSheetRow(order), attempts);

    await Order.updateOne(
      { _id: order._id },
      { sheetSynced: true, sheetSyncedAt: new Date(), sheetSyncError: null }
    );

    console.log(`[sheets] ${order.orderNumber} synced`);
    return true;
  } catch (error) {
    await Order.updateOne(
      { _id: order._id },
      { sheetSynced: false, sheetSyncError: error?.message ?? 'unknown' }
    );

    throw error;
  }
};

/**
 * Push an order's *current* status into the sheet after the shop has moved it.
 *
 * The shop reads orders off this sheet, so an order they completed or cancelled
 * in the admin panel showing as `placed` there is worse than no status column
 * at all -- it is a record that actively contradicts what they did. Marking an
 * order done has to reach both places or neither.
 *
 * The whole row goes, not just the status cell, for two reasons: the Apps
 * Script keys off the header names either way, so a partial payload buys
 * nothing; and if the creation sync never landed (a Google outage while the
 * order was placed) the upsert appends the missing row here instead of failing
 * against a row that does not exist. That is why success sets `sheetSynced`
 * too -- a post that returns OK means the row is in the sheet, whichever branch
 * the script took to put it there.
 *
 * Fewer attempts than a new order on purpose. Both run in the background, but a
 * lost order is unrecoverable and a stale status cell is fixed by the shop
 * tapping the order again -- and the next status change re-posts the whole row
 * regardless.
 */
export const syncOrderStatusToSheet = async (order, { attempts = 2 } = {}) => {
  if (!config.sheetsWebappUrl) {
    console.warn('[sheets] SHEETS_WEBAPP_URL is not set — skipping');
    return false;
  }

  try {
    await postWithRetry(toSheetRow(order), attempts);

    await Order.updateOne(
      { _id: order._id },
      {
        sheetSynced: true,
        sheetSyncedAt: new Date(),
        sheetSyncError: null,
        sheetStatusSyncedAt: new Date(),
        sheetStatusSyncError: null,
      }
    );

    console.log(`[sheets] ${order.orderNumber} status -> ${order.status} synced`);
    return true;
  } catch (error) {
    /*
      `sheetSynced` is deliberately left alone here.

      It answers "is this order in the sheet at all", and a failed status push
      does not un-place a row that landed when the order was created. Flipping
      it would put every status failure into retryFailedSyncs' queue as though
      the order itself had been lost.
    */
    await Order.updateOne(
      { _id: order._id },
      { sheetStatusSyncError: error?.message ?? 'unknown' }
    );

    throw error;
  }
};

/**
 * Retry every order that never made it into the sheet.
 *
 * Exposed so it can be triggered from the admin panel or a cron after a Google
 * outage, rather than someone having to re-enter orders by hand.
 */
export const retryFailedSyncs = async (limit = 50) => {
  const pending = await Order.find({ sheetSynced: false }).sort({ createdAt: 1 }).limit(limit);

  let ok = 0;
  for (const order of pending) {
    try {
      await syncOrderToSheet(order, { attempts: 1 });
      ok += 1;
    } catch {
      // Already recorded on the order; move on to the next one.
    }
  }

  return { attempted: pending.length, synced: ok };
};
