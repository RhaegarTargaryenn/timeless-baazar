/**
 * Collapse the six old order statuses down to the two the shop actually uses.
 *
 *   pending / confirmed / packed / out_for_delivery  ->  placed
 *   delivered                                        ->  completed
 *   cancelled                                        ->  completed  (see below)
 *
 * Run once after deploying the model change:
 *
 *     cd backend && npm run migrate-orders
 *
 * **Idempotent.** Orders already on `placed` or `completed` are left alone, so
 * running it twice, or on a database that was already migrated, does nothing.
 *
 * ## About `cancelled`
 *
 * There is no cancelled state any more, and nothing here can invent one. When
 * this was written the database held nine orders and every one of them was
 * `pending`, so the cancelled branch never fired -- it exists only so the
 * script cannot silently skip a document if it is ever run somewhere that does
 * have them. **If it reports any cancelled orders converted, that is a lie
 * being written into the shop's records and you should stop and add the third
 * status instead.**
 */

import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import Order, { LEGACY_STATUS_MAP, ORDER_STATUSES } from '../models/Order.js';

const run = async () => {
  await connectDatabase();

  // The model's enum no longer contains the old values, so this deliberately
  // goes through the raw collection: a Mongoose query would be fine for the
  // read, but the write would be rejected by validation on the way in.
  const collection = mongoose.connection.db.collection('orders');

  const before = await collection
    .aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    .toArray();

  console.log('[migrate] before:', JSON.stringify(before));

  let converted = 0;
  let cancelledConverted = 0;

  for (const [legacy, next] of Object.entries(LEGACY_STATUS_MAP)) {
    // Already-correct values are not in the map's keys except where a legacy
    // name happens to survive, so this only ever touches stale documents.
    if (ORDER_STATUSES.includes(legacy)) continue;

    const result = await collection.updateMany({ status: legacy }, { $set: { status: next } });

    if (result.modifiedCount > 0) {
      console.log(`[migrate] ${legacy} -> ${next}: ${result.modifiedCount}`);
      converted += result.modifiedCount;
      if (legacy === 'cancelled') cancelledConverted = result.modifiedCount;
    }
  }

  /**
   * The trail the customer's screen reads.
   *
   * Rewritten with the same mapping, or an old order would render a history of
   * stages that no longer exist. Consecutive duplicates are collapsed -- four
   * pre-delivery stages all becoming `placed` would otherwise draw the same row
   * four times.
   */
  let trailsRewritten = 0;
  const cursor = collection.find({ 'statusHistory.0': { $exists: true } });

  for await (const order of cursor) {
    const mapped = [];
    for (const entry of order.statusHistory) {
      const next = ORDER_STATUSES.includes(entry.status)
        ? entry.status
        : LEGACY_STATUS_MAP[entry.status];
      if (!next) continue;
      if (mapped.length > 0 && mapped[mapped.length - 1].status === next) continue;
      mapped.push({ ...entry, status: next });
    }

    const unchanged =
      mapped.length === order.statusHistory.length &&
      mapped.every((entry, i) => entry.status === order.statusHistory[i].status);

    if (unchanged) continue;

    await collection.updateOne({ _id: order._id }, { $set: { statusHistory: mapped } });
    trailsRewritten += 1;
  }

  const after = await collection
    .aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    .toArray();

  console.log('[migrate] after: ', JSON.stringify(after));
  console.log(`[migrate] ${converted} statuses, ${trailsRewritten} trails rewritten`);

  if (cancelledConverted > 0) {
    console.warn(
      `[migrate] WARNING: ${cancelledConverted} cancelled order(s) are now recorded as ` +
        'completed. That is not true. Add a cancelled status rather than shipping this.'
    );
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('[migrate] failed:', error);
  process.exit(1);
});
