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

/**
 * Post the order, retrying a couple of times with a backoff, then record what
 * happened on the order document either way.
 */
export const syncOrderToSheet = async (order, { attempts = 3 } = {}) => {
  if (!config.sheetsWebappUrl) {
    console.warn('[sheets] SHEETS_WEBAPP_URL is not set — skipping');
    return false;
  }

  const row = toSheetRow(order);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await postOnce(row);

      await Order.updateOne(
        { _id: order._id },
        { sheetSynced: true, sheetSyncedAt: new Date(), sheetSyncError: null }
      );

      console.log(`[sheets] ${order.orderNumber} synced`);
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
      }
    }
  }

  await Order.updateOne(
    { _id: order._id },
    { sheetSynced: false, sheetSyncError: lastError?.message ?? 'unknown' }
  );

  throw lastError;
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
