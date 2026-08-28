import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, X, ShoppingBag } from 'lucide-react';

import useCartStore from '../store/cartStore';
import { formatRupees } from '../lib/api';
import { Price } from '../components/ProductCard';
import { Button, EmptyState, cx } from '../components/ui';
import PageHeader from '../components/PageHeader';
import { pageIn, spring, tap, gridItem, gridContainer } from '../lib/motion';

/**
 * The cart, from the Figma source (node `1:1015`, "My Cart").
 *
 * A centred title over a full-bleed hairline, then one row per line: the photo
 * at the left, the name with a dismiss X opposite it, the unit beneath, and a
 * counter weighed against the line total. Rows are separated by an inset
 * hairline rather than being drawn as cards -- the design reads as a list, not
 * a stack of tiles.
 *
 * It used to redirect straight to /checkout whenever it held anything, so the
 * cart tab could never be opened simply to look at.
 */

const CartLine = ({ item }) => {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <motion.div
      variants={gridItem}
      layout
      exit={{ opacity: 0, x: -40, transition: { duration: 0.18 } }}
      transition={spring.layout}
      className="flex gap-3 sm:gap-4 py-[30px] border-b border-line"
    >
      {/*
        The photo floats; the design gives it no tile of its own. It narrows
        below `sm`: the design's 85px plus the 46px stepper and the line total
        needs 355px of room, and a 320px phone does not have it -- the row spilled
        past the right edge and gave the page a horizontal scroll.
      */}
      <div className="w-[64px] sm:w-[85px] shrink-0 flex items-center justify-center">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="max-w-full max-h-[64px] sm:max-h-[85px] object-contain"
          />
        ) : (
          <div className="text-3xl opacity-30">🛒</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 min-w-0 text-[16px] font-bold tracking-[0.1px] text-ink leading-[18px] line-clamp-2">
            {item.name}
          </h3>
          <motion.button
            whileTap={tap}
            onClick={() => removeItem(item.productId, item.variantId)}
            aria-label={`Remove ${item.name}`}
            className="shrink-0 -mt-1 -mr-1 w-8 h-8 flex items-center justify-center text-ink-faint hover:text-coral transition-colors"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </motion.button>
        </div>

        <p className="mt-1.5 text-[14px] leading-[18px] text-ink-muted line-clamp-1">
          {item.variantLabel}
          {item.nameHindi ? `, ${item.nameHindi}` : ''}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center">
            <motion.button
              whileTap={tap}
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
              aria-label="Reduce quantity"
              className="w-10 h-10 sm:w-[46px] sm:h-[46px] rounded-[17px] border border-line flex items-center justify-center text-ink-faint shrink-0"
            >
              <Minus className="w-[18px] h-[18px]" strokeWidth={2.6} />
            </motion.button>

            <motion.span
              key={item.quantity}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={spring.snappy}
              className="w-[34px] sm:w-[42px] text-center text-[16px] font-semibold text-ink tabular"
            >
              {item.quantity}
            </motion.span>

            <motion.button
              whileTap={tap}
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
              aria-label="Increase quantity"
              className="w-10 h-10 sm:w-[46px] sm:h-[46px] rounded-[17px] border border-line flex items-center justify-center text-brand-600 shrink-0"
            >
              <Plus className="w-[18px] h-[18px]" strokeWidth={2.6} />
            </motion.button>
          </div>

          <Price
            paise={item.price * item.quantity}
            className="shrink-0 text-[16px] sm:text-[18px] tracking-[0.1px]"
          />
        </div>
      </div>
    </motion.div>
  );
};

const Cart = () => {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);

  const subtotal = getTotal();

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface flex flex-col">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader title="My Cart" />

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Your cart is empty"
          message="Add some dal, rice or masala and it will show up here."
          action={<Button to="/products">Start shopping</Button>}
        />
      ) : (
        <>
          {/*
            The last row's own hairline is hidden, so the list does not end on a
            rule immediately above the button.
          */}
          <motion.div
            variants={gridContainer}
            initial="initial"
            animate="animate"
            className="flex-1 px-[25px] [&>div:last-child]:border-b-0"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <CartLine key={`${item.productId}-${item.variantId}`} item={item} />
              ))}
            </AnimatePresence>
          </motion.div>

          {/*
            Sticky rather than pinned: the design's button sits at the foot of
            the screen, and on a long cart it has to stay reachable without the
            customer scrolling to the end. It clears the bottom nav.
          */}
          <div
            className={cx(
              'sticky bottom-0 z-30 bg-surface px-[25px] pt-4 border-t border-line',
              'pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-5'
            )}
          >
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/checkout')}
              className="relative w-full h-[67px] rounded-[19px] bg-brand-600 text-[#FCFCFC] text-[18px] font-semibold flex items-center justify-center"
            >
              Go to Checkout
              {/*
                The total rides inside the button as a darker chip, exactly as
                the design draws it. Indicative only — the server recomputes
                every price from the live catalogue when the order is placed, so
                a stale figure can be shown but never charged.
              */}
              <span className="absolute right-4 px-[5px] py-[2px] rounded-[4px] bg-[#489E67] text-[12px] font-semibold tabular">
                {formatRupees(subtotal)}
              </span>
            </motion.button>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Cart;
