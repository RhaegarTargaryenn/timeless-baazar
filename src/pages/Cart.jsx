import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

import useCartStore from '../store/cartStore';
import { formatRupees } from '../lib/api';
import ForestHeader, { Sheet } from '../components/ForestHeader';
import { Price } from '../components/ProductCard';
import { Button, EmptyState } from '../components/ui';
import { pageIn, spring, tap, gridItem, gridContainer } from '../lib/motion';

const CartLine = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <motion.div
      variants={gridItem}
      layout
      exit={{ opacity: 0, x: -40, transition: { duration: 0.18 } }}
      transition={spring.layout}
      className="flex gap-3 p-2.5 bg-surface-raised border border-line rounded-card"
    >
      <div className="w-20 h-20 shrink-0 rounded-xl bg-surface-sunken overflow-hidden">
        {item.image ? (
          <img src={item.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🛒</div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink line-clamp-1">{item.name}</h3>
            <p className="text-[11px] text-ink-faint mt-0.5">
              {item.variantLabel} · {formatRupees(item.price)} each
            </p>
          </div>

          <motion.button
            whileTap={tap}
            onClick={() => removeItem(item.productId, item.variantId)}
            aria-label={`Remove ${item.name}`}
            className="shrink-0 w-8 h-8 -mr-1 -mt-1 rounded-lg flex items-center justify-center text-ink-faint hover:text-coral"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto pt-2">
          <div className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-950/40 rounded-full p-1">
            <motion.button
              whileTap={tap}
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
              aria-label="Reduce quantity"
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.button>
            <motion.span
              key={item.quantity}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={spring.snappy}
              className="w-7 text-center text-sm font-bold text-ink tabular"
            >
              {item.quantity}
            </motion.span>
            <motion.button
              whileTap={tap}
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.button>
          </div>

          <Price paise={item.price * item.quantity} className="text-base" />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * The cart.
 *
 * It used to redirect straight to /checkout whenever it held anything, so the
 * cart tab could never be opened simply to look at — a customer adding things
 * over a few minutes had no way to review them without starting checkout.
 */
const Cart = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();

  const subtotal = getTotal();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      <ForestHeader title="My Cart" showBack>
        {count > 0 && (
          <p className="text-center text-xs text-white/55 mt-2">
            {count} item{count !== 1 ? 's' : ''} · pay cash on delivery
          </p>
        )}
      </ForestHeader>

      <Sheet className="px-4 pt-5 pb-36 sm:pb-8">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="w-7 h-7" />}
            title="Your cart is empty"
            message="Add some dal, rice or masala and it will show up here."
            action={<Button to="/products">Start shopping</Button>}
          />
        ) : (
          <>
            <div className="flex items-center justify-end mb-3">
              <button
                onClick={() => {
                  if (window.confirm('Empty the whole cart?')) clearCart();
                }}
                className="text-xs font-semibold text-ink-faint hover:text-coral transition-colors"
              >
                Clear all
              </button>
            </div>

            <motion.div
              variants={gridContainer}
              initial="initial"
              animate="animate"
              className="space-y-2.5"
            >
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <CartLine key={`${item.productId}-${item.variantId}`} item={item} />
                ))}
              </AnimatePresence>
            </motion.div>

            {/*
              Indicative only. The server recomputes every price from the live
              catalogue when the order is placed, so a stale figure can be shown
              but never charged.
            */}
            <motion.div
              layout
              transition={spring.layout}
              className="mt-4 p-4 rounded-card bg-surface-sunken"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-muted">Subtotal</span>
                <Price paise={subtotal} className="text-xl" />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm text-ink-muted">Delivery</span>
                <span className="text-sm font-semibold text-brand-600">Free</span>
              </div>
            </motion.div>

            {/* Floats above the nav pill so the primary action is always in reach */}
            <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-4 mt-4 z-30">
              <motion.button
                whileTap={tap}
                onClick={() => navigate('/checkout')}
                className="w-full h-14 rounded-full bg-brand-600 text-white font-bold shadow-brand flex items-center justify-center gap-2"
              >
                Checkout
                <span className="opacity-70">·</span>
                <span className="tabular">{formatRupees(subtotal)}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </>
        )}
      </Sheet>
    </motion.div>
  );
};

export default Cart;
