import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  MessageCircle,
  Receipt,
} from '../components/icons';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { api, formatRupees } from '../lib/api';
import { Price } from '../components/ProductCard';
import { Skeleton, EmptyState, Button, Badge, cx } from '../components/ui';
import PageHeader from '../components/PageHeader';
import { pageIn, spring, tap, gridItem, gridContainer, EASE } from '../lib/motion';

/**
 * Orders, and the journey of one of them.
 *
 * The design file has no orders screen, so this is built from the vocabulary
 * the converted screens already share: a centred 20px title over a full-bleed
 * hairline, a 25px gutter, and rows separated by hairlines rather than drawn as
 * cards -- the same list grammar as My Cart (`1:1015`). It reads as one app
 * with the order-accepted screen it is reached from, which the forest header it
 * used to wear did not.
 *
 * One screen, two views: the list, and a detail that slides in over it. The
 * detail is not a route of its own, so the browser back button leaves the
 * screen entirely -- the chevron in the header is what returns to the list.
 */

/**
 * The journey, in order. Two stops.
 *
 * It used to draw five -- received, confirmed, packed, out for delivery,
 * delivered -- and the shop had no way to advance any of them. Every order sat
 * on the first stage forever, so the trail was showing the customer four
 * greyed-out stages that would never light up, which reads as an order that has
 * been forgotten rather than one that is being packed.
 *
 * Two stages are two the shop actually keeps true: the order is in, and the
 * order has been handed over.
 */
const JOURNEY = [
  { id: 'placed', label: 'Order placed', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 },
];

/**
 * `cancelled` is deliberately not in JOURNEY.
 *
 * It is an end state beside `completed`, not a stop on the way to it. Drawing
 * it as a stage would tell the customer their cancelled order is still moving.
 */
const CANCELLED = 'cancelled';

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Completed reads as settled, cancelled as wrong, anything else as open. */
const statusTone = (status) => {
  if (status === 'completed') return 'brand';
  if (status === CANCELLED) return 'red';
  return 'amber';
};

const statusLabel = (status) =>
  status === CANCELLED
    ? 'Cancelled'
    : JOURNEY.find((stage) => stage.id === status)?.label ?? status;

/** A heading inside the detail view, matching the 18px rows on Account. */
const SubHeading = ({ children }) => (
  <h2 className="text-[18px] font-semibold text-ink mb-3">{children}</h2>
);

const StatusTrail = ({ status }) => {
  /*
    A cancelled order gets its own panel instead of the trail: there is no
    progress left to show, and the one thing the customer wants is a way to
    query it.
  */
  if (status === CANCELLED) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-[19px] bg-surface-sunken">
        <XCircle className="w-6 h-6 text-coral shrink-0" />
        <div>
          <p className="text-[16px] font-semibold text-ink">Order cancelled</p>
          <p className="text-[14px] text-ink-muted mt-0.5">
            The shop cancelled this order. Call them if you think it is a mistake.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = JOURNEY.findIndex((stage) => stage.id === status);

  return (
    <div className="relative">
      {JOURNEY.map((stage, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const Icon = stage.icon;

        return (
          <div key={stage.id} className="flex gap-4 pb-6 last:pb-0">
            <div className="relative flex flex-col items-center shrink-0">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring.snappy, delay: index * 0.06 }}
                className={cx(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  done ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-faint'
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
              </motion.span>

              {/* The rail fills only as far as progress has reached */}
              {index < JOURNEY.length - 1 && (
                <span className="w-0.5 flex-1 mt-1 bg-surface-sunken relative overflow-hidden">
                  {index < currentIndex && (
                    <motion.span
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE }}
                      style={{ originY: 0 }}
                      className="absolute inset-0 bg-brand-600"
                    />
                  )}
                </span>
              )}
            </div>

            <div className="pt-2">
              <p
                className={cx(
                  'text-[16px] font-semibold',
                  done ? 'text-ink' : 'text-ink-faint'
                )}
              >
                {stage.label}
              </p>
              {current && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[14px] text-brand-600 font-semibold mt-0.5"
                >
                  {stage.id === 'completed'
                    ? 'Handed over by the shop'
                    : 'The shop has your order and is putting it together'}
                </motion.p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** One row in the list. Hairline-separated, as My Cart draws its lines. */
const OrderRow = ({ order, onOpen }) => (
  <motion.button
    variants={gridItem}
    whileTap={tap}
    onClick={onOpen}
    className="w-full text-left py-[22px] border-b border-line flex items-center gap-4"
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2.5">
        <p className="text-[16px] font-semibold text-ink font-mono tracking-wide truncate">
          {order.orderNumber}
        </p>
        <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
      </div>

      <p className="mt-1.5 text-[14px] text-ink-muted truncate">
        {order.items.length} item{order.items.length !== 1 ? 's' : ''} ·{' '}
        {order.items[0]?.name}
        {order.items.length > 1 && ` +${order.items.length - 1} more`}
      </p>
      <p className="mt-0.5 text-[13px] text-ink-faint">{formatDate(order.createdAt)}</p>
    </div>

    <span className="shrink-0 flex items-center gap-1.5 text-[16px] font-semibold text-ink tabular">
      {formatRupees(order.total)}
      <ChevronRight className="w-[18px] h-[18px] text-ink-faint" />
    </span>
  </motion.button>
);

const OrderTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState(null);

  // ProtectedRoute guarantees a signed-in user by the time this renders, so
  // this only has to fetch.
  useEffect(() => {
    if (!user) return undefined;

    const controller = new AbortController();

    api
      .get('/orders', { signal: controller.signal })
      .then((data) => setOrders(data.orders))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        toast.error('Could not load your orders.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [user]);

  const detail = orders.find((order) => order.orderNumber === openOrder);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      {/*
        In the detail view back is a within-screen move to the list, so it is
        handed an explicit handler; in the list it falls through to history,
        which is what returns you to the order-accepted screen.
      */}
      <PageHeader
        title={detail ? detail.orderNumber : 'Orders'}
        titleClassName={detail ? 'font-mono tracking-wide' : undefined}
        onBack={detail ? () => setOpenOrder(null) : undefined}
      />

      <div className="px-[25px] pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-10">
        <AnimatePresence mode="wait">
          {detail ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="pt-7"
            >
              <StatusTrail status={detail.status} />

              <div className="mt-9">
                <SubHeading>Items</SubHeading>
                <div className="space-y-2.5">
                  {detail.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 rounded-[19px] bg-surface-sunken"
                    >
                      <div className="w-16 h-16 shrink-0 rounded-[14px] bg-surface-raised overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ink-faint">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-semibold text-ink line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-[14px] text-ink-faint mt-0.5">
                          {item.variantLabel} × {item.quantity}
                        </p>
                      </div>
                      <span className="text-[16px] font-semibold text-ink tabular shrink-0">
                        {formatRupees(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-5 rounded-[19px] bg-surface-sunken">
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-ink-muted">Subtotal</span>
                  <span className="font-semibold text-ink tabular">
                    {formatRupees(detail.subtotal)}
                  </span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex items-center justify-between text-[16px] mt-2 text-brand-600">
                    <span>Discount{detail.coupon?.code ? ` (${detail.coupon.code})` : ''}</span>
                    <span className="font-semibold tabular">
                      −{formatRupees(detail.discount)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-line my-4" />
                <div className="flex items-center justify-between">
                  <span className="text-[18px] font-semibold text-ink">Total</span>
                  <Price paise={detail.total} className="text-[18px]" />
                </div>
              </div>

              <div className="mt-4 p-5 rounded-[19px] bg-surface-sunken">
                <p className="text-[14px] font-semibold text-ink-muted mb-1.5">
                  Delivering to
                </p>
                <p className="text-[16px] text-ink leading-relaxed">
                  {[detail.address?.street, detail.address?.street2, detail.address?.village]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="text-[14px] text-ink-faint mt-1">
                  {detail.address?.city}, {detail.address?.state} — {detail.address?.zipCode}
                </p>
              </div>

              <motion.a
                whileTap={tap}
                href={`https://wa.me/919266667069?text=${encodeURIComponent(
                  `Hi, I have a question about order ${detail.orderNumber}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-8 w-full h-[67px] rounded-[19px] bg-brand-600 text-[#FFF9FF] text-[18px] font-semibold flex items-center justify-center gap-2.5"
              >
                <MessageCircle className="w-5 h-5" />
                Ask about this order
              </motion.a>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {loading ? (
                <div className="pt-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-[92px] rounded-[19px]" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="w-7 h-7" />}
                  title="No orders yet"
                  message="Once you place an order it will show up here, and you can follow it until it arrives."
                  action={<Button to="/products">Start shopping</Button>}
                />
              ) : (
                <motion.div
                  variants={gridContainer}
                  initial="initial"
                  animate="animate"
                  /* The last row's hairline would sit alone above the nav. */
                  className="[&>button:last-child]:border-b-0"
                >
                  {orders.map((order) => (
                    <OrderRow
                      key={order.orderNumber}
                      order={order}
                      onOpen={() => setOpenOrder(order.orderNumber)}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default OrderTracking;
