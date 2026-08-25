import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronRight,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { api, formatRupees } from '../lib/api';
import ForestHeader, { Sheet } from '../components/ForestHeader';
import { Price } from '../components/ProductCard';
import { Skeleton, EmptyState, Button, cx } from '../components/ui';
import { pageIn, spring, tap, gridItem, gridContainer, EASE } from '../lib/motion';

/**
 * The delivery journey, in order.
 *
 * `cancelled` is deliberately outside this list — it is not a stage on the way
 * to delivered, and drawing it as one would be misleading.
 */
const JOURNEY = [
  { id: 'pending', label: 'Order received', icon: Clock },
  { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { id: 'packed', label: 'Packed', icon: Package },
  { id: 'out_for_delivery', label: 'Out for delivery', icon: Truck },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const StatusTrail = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-card bg-red-50 dark:bg-red-950/30">
        <XCircle className="w-5 h-5 text-coral shrink-0" />
        <div>
          <p className="text-sm font-bold text-ink">Order cancelled</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Call the shop if you think this is a mistake.
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
          <div key={stage.id} className="flex gap-3 pb-5 last:pb-0">
            <div className="relative flex flex-col items-center shrink-0">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring.snappy, delay: index * 0.06 }}
                className={cx(
                  'w-9 h-9 rounded-full flex items-center justify-center',
                  done ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-faint'
                )}
              >
                <Icon className="w-4 h-4" />
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

            <div className="pt-1.5">
              <p
                className={cx(
                  'text-sm font-semibold',
                  done ? 'text-ink' : 'text-ink-faint'
                )}
              >
                {stage.label}
              </p>
              {current && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-brand-600 font-medium mt-0.5"
                >
                  Where your order is now
                </motion.p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OrderCard = ({ order, onOpen }) => (
  <motion.button
    variants={gridItem}
    whileTap={tap}
    onClick={onOpen}
    className="w-full text-left p-4 rounded-card bg-surface-raised border border-line"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink font-mono tracking-wide">
          {order.orderNumber}
        </p>
        <p className="text-xs text-ink-faint mt-0.5">{formatDate(order.createdAt)}</p>
      </div>
      <span
        className={cx(
          'shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold',
          order.status === 'delivered' && 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400',
          order.status === 'cancelled' && 'bg-red-50 text-coral dark:bg-red-950/40',
          !['delivered', 'cancelled'].includes(order.status) &&
            'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        )}
      >
        {JOURNEY.find((s) => s.id === order.status)?.label ?? order.status}
      </span>
    </div>

    <div className="flex items-center justify-between gap-3 mt-3">
      <p className="text-xs text-ink-muted truncate">
        {order.items.length} item{order.items.length !== 1 ? 's' : ''} ·{' '}
        {order.items[0]?.name}
        {order.items.length > 1 && ` +${order.items.length - 1} more`}
      </p>
      <span className="shrink-0 flex items-center gap-1 text-sm font-bold text-ink tabular">
        {formatRupees(order.total)}
        <ChevronRight className="w-4 h-4 text-ink-faint" />
      </span>
    </div>
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
      <ForestHeader title={detail ? detail.orderNumber : 'My Orders'} showBack={Boolean(detail)}>
        {!detail && orders.length > 0 && (
          <p className="text-center text-xs text-white/55 mt-2">
            {orders.length} order{orders.length !== 1 ? 's' : ''} so far
          </p>
        )}
      </ForestHeader>

      <Sheet className="px-4 pt-5 pb-36 sm:pb-8">
        <AnimatePresence mode="wait">
          {detail ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <button
                onClick={() => setOpenOrder(null)}
                className="text-xs font-semibold text-brand-600 mb-4"
              >
                ← All orders
              </button>

              <StatusTrail status={detail.status} />

              <div className="mt-6">
                <h2 className="text-sm font-bold text-ink mb-2.5">Items</h2>
                <div className="space-y-2">
                  {detail.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 rounded-2xl bg-surface-sunken"
                    >
                      <div className="w-14 h-14 shrink-0 rounded-xl bg-surface-raised overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg opacity-30">
                            🛒
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-xs text-ink-faint mt-0.5">
                          {item.variantLabel} × {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-ink tabular shrink-0">
                        {formatRupees(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 p-4 rounded-card bg-surface-sunken">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Subtotal</span>
                  <span className="font-semibold text-ink tabular">
                    {formatRupees(detail.subtotal)}
                  </span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2 text-brand-700 dark:text-brand-400">
                    <span>Discount{detail.coupon?.code ? ` (${detail.coupon.code})` : ''}</span>
                    <span className="font-semibold tabular">
                      −{formatRupees(detail.discount)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-line my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">Total</span>
                  <Price paise={detail.total} className="text-lg" />
                </div>
              </div>

              <div className="mt-5 p-4 rounded-card bg-surface-sunken">
                <p className="text-xs font-semibold text-ink-muted mb-1">Delivering to</p>
                <p className="text-sm text-ink leading-relaxed">
                  {[detail.address?.street, detail.address?.street2, detail.address?.village]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="text-xs text-ink-faint mt-0.5">
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
                className="mt-5 w-full h-13 py-3.5 rounded-full bg-forest text-white font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
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
                <div className="space-y-2.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-card" />
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
                  className="space-y-2.5"
                >
                  {orders.map((order) => (
                    <OrderCard
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
      </Sheet>
    </motion.div>
  );
};

export default OrderTracking;
