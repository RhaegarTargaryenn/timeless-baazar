import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import {
  Receipt,
  Check,
  Clock,
  ChevronDown,
  Phone,
  MapPin,
  Package,
  XCircle,
} from '../../components/icons';
import { api, formatRupees } from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { Skeleton, EmptyState, Button, cx } from '../../components/ui';
import { spring, gridContainer, gridItem, EASE } from '../../lib/motion';

/**
 * Orders, for the shop.
 *
 * The client reads orders off a Google Sheet today and rings customers back
 * from it. This screen is meant to replace that habit, so it is built around
 * the two things that routine actually needs: **who to call**, and **what to
 * put in the bag**. Everything else is secondary.
 *
 * Three states: `placed`, `completed` and `cancelled`. See ORDER_STATUSES in
 * `backend/src/models/Order.js` for why the original six became these.
 *
 * `cancelled` is an end state beside `completed`, never a stage on the way to
 * it -- nothing here draws the three as a progress bar. Cancelling is rare and
 * destructive, so unlike "Mark done" it lives one level down in the expanded
 * panel and asks first. Every move is reversible: reopening puts the order back
 * to `placed`, which also hands the customer back their coupon use.
 */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'placed', label: 'To do' },
  { id: 'completed', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
];

const formatWhen = (value) => {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  const time = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // "Today, 4:20 pm" is what the client needs on the busy rows; older ones get
  // a date instead, because the time of day stops mattering.
  if (sameDay) return `Today, ${time}`;

  return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
};

/** Everything the client needs to hand this order over, on one line each. */
const AddressBlock = ({ address }) => (
  <div className="flex gap-2.5">
    <MapPin className="w-4 h-4 text-ink-faint shrink-0 mt-0.5" />
    <div className="text-[13px] leading-[19px] text-ink-muted min-w-0">
      <p className="text-ink font-semibold">{address.label}</p>
      <p>{address.street}</p>
      {address.street2 ? <p>{address.street2}</p> : null}
      {address.village ? <p>{address.village}</p> : null}
      <p>
        {address.city}, {address.state} {address.zipCode}
      </p>
    </div>
  </div>
);

/**
 * One order.
 *
 * Collapsed it answers "who, when, how much, how many things". Expanded it
 * lists the items and the address. The client is standing at a counter, so the
 * collapsed row has to be readable at arm's length and the primary action has
 * to be reachable without opening anything.
 */
const OrderCard = ({ order, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const done = order.status === 'completed';
  const cancelled = order.status === 'cancelled';
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const NOTES = {
    completed: 'Completed by shop',
    cancelled: 'Cancelled by shop',
    placed: 'Reopened by shop',
  };

  const MESSAGES = {
    completed: 'marked done',
    cancelled: 'cancelled',
    placed: 'reopened',
  };

  const setStatus = async (next) => {
    setSaving(true);
    try {
      const { order: updated } = await api.patch(`/orders/${order.orderNumber}/status`, {
        status: next,
        note: NOTES[next],
      });

      // Cancelling is not a success. It gets the heavier "something happened"
      // pattern rather than the one the customer's order confirmation uses.
      haptic(next === 'completed' ? 'success' : next === 'cancelled' ? 'warning' : 'impact');
      toast.success(`${order.orderNumber} ${MESSAGES[next]}`);
      setConfirmingCancel(false);
      onChanged(updated);
    } catch (error) {
      haptic('error');
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.article
      variants={gridItem}
      layout
      transition={spring.layout}
      className={cx(
        'bg-surface-raised border rounded-2xl overflow-hidden transition-colors',
        cancelled
          ? 'border-line opacity-70'
          : done
            ? 'border-line'
            : 'border-brand-200 dark:border-brand-900'
      )}
    >
      {/*
        A left edge in the accent colour, not a badge in the corner. The client
        is scanning a column of these for the ones still to do, and an edge
        reads at a glance where a small pill does not. Cancelled rows also fade,
        because they are the one kind that should never draw the eye.
      */}
      <div className="flex">
        <span
          aria-hidden="true"
          className={cx(
            'w-1 shrink-0',
            cancelled ? 'bg-coral' : done ? 'bg-line' : 'bg-brand-600'
          )}
        />

        <div className="flex-1 min-w-0 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cx(
                  'text-[15px] font-bold truncate',
                  cancelled ? 'text-ink-muted line-through' : 'text-ink'
                )}
              >
                {order.userName || order.address?.label || 'Customer'}
              </p>
              <p className="text-[12px] text-ink-muted mt-0.5 tabular">
                {order.orderNumber} · {formatWhen(order.createdAt)}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-[15px] font-bold text-ink tabular">
                {formatRupees(order.total)}
              </p>
              <p className="text-[12px] text-ink-muted">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {/*
            The phone number is a `tel:` link, deliberately.

            Ringing the customer is the single most common thing the client does
            with an order -- to confirm it, or to say they are outside. Making
            them copy a number out of a sheet is the friction this screen exists
            to remove.
          */}
          {order.address?.phone ? (
            <a
              href={`tel:${order.address.phone}`}
              onClick={() => haptic('tap')}
              className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 h-8 rounded-lg bg-surface-sunken text-[13px] font-semibold text-ink active:bg-line transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-brand-600" weight="fill" />
              {order.address.phone}
            </a>
          ) : (
            <p className="mt-2.5 text-[12px] text-ink-faint">No phone number on this order</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant={done || cancelled ? 'secondary' : 'primary'}
              loading={saving}
              onClick={() => setStatus(done || cancelled ? 'placed' : 'completed')}
              className="flex-1"
            >
              {!saving &&
                (done || cancelled ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                ))}
              {done || cancelled ? 'Reopen' : 'Mark done'}
            </Button>

            <button
              type="button"
              onClick={() => {
                haptic('tap');
                setOpen((value) => !value);
              }}
              aria-expanded={open}
              className="flex items-center gap-1 px-3 h-10 rounded-xl text-[13px] font-semibold text-ink-muted bg-surface-sunken active:bg-line transition-colors"
            >
              {open ? 'Hide' : 'Details'}
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="flex"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="detail"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="pt-3.5 mt-3.5 border-t border-line space-y-3.5">
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div
                        key={`${item.productId ?? index}-${item.variantId ?? index}`}
                        className="flex items-center gap-2.5"
                      >
                        <span className="w-9 h-9 rounded-lg bg-surface-sunken overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-ink-faint" />
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">
                            {item.name}
                          </p>
                          <p className="text-[12px] text-ink-muted">{item.variantLabel}</p>
                        </div>

                        <p className="text-[13px] text-ink-muted tabular shrink-0">
                          {item.quantity} × {formatRupees(item.price)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {order.address ? <AddressBlock address={order.address} /> : null}

                  {/*
                    Only the lines that carry information. A ₹0 discount row on
                    every order is noise, and delivery is always free today.
                  */}
                  <div className="text-[13px] space-y-1 pt-0.5">
                    <div className="flex justify-between text-ink-muted">
                      <span>Subtotal</span>
                      <span className="tabular">{formatRupees(order.subtotal)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-brand-600">
                        <span>Discount{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
                        <span className="tabular">−{formatRupees(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-ink pt-1 border-t border-line">
                      <span>Total</span>
                      <span className="tabular">{formatRupees(order.total)}</span>
                    </div>
                  </div>

                  {order.userEmail ? (
                    <p className="text-[12px] text-ink-faint truncate">{order.userEmail}</p>
                  ) : null}

                  {/*
                    Cancelling lives down here on purpose.

                    Marking done happens constantly and is one tap on the
                    collapsed row. Cancelling is rare and writes a customer's
                    order off, so it sits behind opening the card and then
                    behind a confirm -- but an inline confirm, not
                    `window.confirm`, which is what the old "Clear all" used and
                    was removed for.
                  */}
                  {!cancelled && (
                    <div className="pt-1">
                      <AnimatePresence mode="wait" initial={false}>
                        {confirmingCancel ? (
                          <motion.div
                            key="confirm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: EASE }}
                            className="flex items-center gap-2"
                          >
                            <p className="flex-1 text-[13px] text-ink-muted">
                              Cancel this order?
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setConfirmingCancel(false)}
                            >
                              No
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={saving}
                              onClick={() => setStatus('cancelled')}
                            >
                              Yes, cancel
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="ask"
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: EASE }}
                            onClick={() => {
                              haptic('tap');
                              setConfirmingCancel(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-coral"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel this order
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
};

const ListSkeleton = () => (
  <div className="space-y-2.5" role="status" aria-label="Loading orders">
    {Array.from({ length: 4 }).map((_, index) => (
      <Skeleton
        key={index}
        className="h-[150px] rounded-2xl"
        style={{ opacity: 1 - index * 0.18 }}
      />
    ))}
  </div>
);

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ all: 0, placed: 0, completed: 0, cancelled: 0 });
  const [filter, setFilter] = useState('placed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/orders/admin/all?limit=100');
      setOrders(data.orders);
      setCounts(data.counts ?? { all: data.total, placed: 0, completed: 0, cancelled: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Swap the changed order in place and adjust the counts locally.
   *
   * A refetch would be simpler but it reorders the list under the client's
   * finger the instant they tap "Mark done", which on a phone means the next
   * row jumps into where their thumb already is.
   */
  const handleChanged = useCallback((updated) => {
    let previous;

    setOrders((current) =>
      current.map((order) => {
        if (order._id !== updated._id) return order;
        previous = order.status;
        return { ...order, ...updated };
      })
    );

    // Decrement whichever bucket it left and increment the one it joined, rather
    // than assuming a two-way toggle -- with three statuses an order can move
    // from cancelled straight back to placed.
    setCounts((current) => {
      if (!previous || previous === updated.status) return current;
      return {
        ...current,
        [previous]: Math.max(0, (current[previous] ?? 0) - 1),
        [updated.status]: (current[updated.status] ?? 0) + 1,
      };
    });
  }, []);

  // Filtering client-side: the whole book is one request at this shop's volume,
  // and it keeps a tab switch instant rather than a round trip.
  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter]
  );

  const countFor = (id) => (id === 'all' ? counts.all : counts[id]) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Orders</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {counts.placed > 0
              ? `${counts.placed} waiting to be packed`
              : 'Nothing waiting — all caught up'}
          </p>
        </div>
      </div>

      {/* The filter row. Counts come from the server, so they cover every page. */}
      <div className="flex gap-2">
        {FILTERS.map(({ id, label }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (!active) haptic('tap');
                setFilter(id);
              }}
              className={cx(
                'relative flex-1 min-w-0 h-10 px-1 rounded-xl text-[12px] font-bold transition-colors',
                active ? 'text-white' : 'text-ink-muted bg-surface-raised border border-line'
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-order-filter"
                  transition={spring.layout}
                  className="absolute inset-0 rounded-xl bg-forest"
                />
              )}
              <span className="relative block truncate">
                {label}
                {countFor(id) > 0 && (
                  <span className={cx('ml-1 tabular', active ? 'text-white/70' : 'text-ink-faint')}>
                    {countFor(id)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-ink-muted mb-4">{error}</p>
          <Button size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-7 h-7" />}
          title={
            filter === 'completed'
              ? 'Nothing completed yet'
              : filter === 'cancelled'
                ? 'Nothing cancelled'
                : 'No orders here'
          }
          message={
            filter === 'placed'
              ? 'Every order has been handed over. New ones will appear here.'
              : filter === 'cancelled'
                ? 'No order has been cancelled, which is how it should be.'
                : 'Orders customers place will show up on this screen.'
          }
        />
      ) : (
        <motion.div
          variants={gridContainer}
          initial="initial"
          animate="animate"
          className="space-y-2.5"
        >
          {visible.map((order) => (
            <OrderCard key={order._id} order={order} onChanged={handleChanged} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default AdminOrders;
