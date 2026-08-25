import React, { useState, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

import useCartStore from '../store/cartStore';
import ProductDetailsModal from './ProductDetailsModal';
import { spring, tap, gridItem } from '../lib/motion';
import { cx } from './ui';

const CATEGORY_EMOJI = {
  daal: '🥘',
  rice: '🍚',
  flour: '🌾',
  spices: '🌶️',
  snacks: '🍿',
  grocery: '🛍️',
};

/**
 * Price as ₹132·⁵⁰ — rupees large, paise raised and small.
 *
 * Prices are whole rupees almost everywhere here, so the paise part usually
 * renders as nothing at all and the number reads clean.
 */
const Price = ({ paise, className }) => {
  const rupees = Math.floor(paise / 100);
  const paisePart = paise % 100;

  return (
    <span className={cx('font-extrabold text-ink tabular leading-none', className)}>
      ₹{rupees}
      {paisePart > 0 && (
        <sup className="text-[0.65em] font-bold ml-px">
          {String(paisePart).padStart(2, '0')}
        </sup>
      )}
    </span>
  );
};

/**
 * The add control at the foot of every card.
 *
 * A wide pill rather than a small circular button: it is the one thing on the
 * card a customer taps repeatedly, and it morphs in place into a − 1 + stepper
 * once the item is in the cart. `layout` on the shared pill makes that a single
 * continuous shape change rather than one element swapping for another.
 */
const AddControl = ({ product, variant, disabled }) => {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const quantity = useCartStore((state) =>
    state.items.find(
      (item) => item.productId === product._id && item.variantId === variant?._id
    )?.quantity ?? 0
  );

  const reduced = useReducedMotion();
  const layoutTransition = reduced ? { duration: 0 } : spring.layout;

  const stop = (event) => {
    event.stopPropagation();
    event.preventDefault();
  };

  if (disabled) {
    return (
      <div className="h-9 rounded-full bg-surface-sunken flex items-center justify-center text-xs font-semibold text-ink-faint">
        Unavailable
      </div>
    );
  }

  return (
    <motion.div
      layout
      transition={layoutTransition}
      className="h-9 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center overflow-hidden"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {quantity === 0 ? (
          <motion.button
            key="add"
            layout
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={layoutTransition}
            whileTap={tap}
            onClick={(event) => {
              stop(event);
              addItem(product, variant, 1);
            }}
            aria-label={`Add ${product.name} to cart`}
            className="w-full h-full flex items-center justify-center text-brand-700 dark:text-brand-400"
          >
            <Plus className="w-4 h-4" strokeWidth={2.6} />
          </motion.button>
        ) : (
          <motion.div
            key="stepper"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={layoutTransition}
            className="w-full h-full flex items-center justify-between px-1"
          >
            <motion.button
              whileTap={tap}
              onClick={(event) => {
                stop(event);
                updateQuantity(product._id, variant._id, quantity - 1);
              }}
              aria-label="Reduce quantity"
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.button>

            <motion.span
              key={quantity}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={spring.snappy}
              className="text-sm font-bold text-ink tabular"
            >
              {quantity}
            </motion.span>

            <motion.button
              whileTap={tap}
              onClick={(event) => {
                stop(event);
                updateQuantity(product._id, variant._id, quantity + 1);
              }}
              aria-label="Increase quantity"
              className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ProductCard = memo(({ product }) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  // The API already strips variants the shop marked out of stock.
  const variants = product.variants ?? [];
  const variant = variants[variants.length - 1] ?? null;
  const canBuy = Boolean(variant);

  // A badge only where the shop entered a real list price. The old storefront
  // computed one as price / 0.8 and showed "20% off" on every single product.
  const hasDiscount = variant?.mrp != null && variant.mrp > variant.price;
  const discountPercent = hasDiscount
    ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
    : 0;

  return (
    <>
      <motion.article
        variants={gridItem}
        whileTap={{ scale: 0.985 }}
        onClick={() => setSheetOpen(true)}
        className="flex flex-col bg-surface-raised border border-line rounded-card p-2.5 cursor-pointer"
      >
        <div className="relative aspect-square rounded-xl bg-surface-sunken overflow-hidden mb-2">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-25">
              {CATEGORY_EMOJI[product.category?.slug] ?? '🛒'}
            </div>
          )}

          {hasDiscount && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-coral text-white text-[10px] font-bold">
              {discountPercent}% off
            </span>
          )}
        </div>

        <h3 className="text-[13px] font-semibold text-ink leading-tight line-clamp-2 min-h-[2.2em]">
          {product.name}
        </h3>
        <p className="text-[11px] text-ink-faint mt-0.5 line-clamp-1">
          {product.nameHindi || product.category?.name}
        </p>
        <p className="text-[11px] text-ink-faint mt-1">{variant?.label ?? '—'}</p>

        <div className="flex items-baseline gap-1.5 mt-1.5 mb-2.5">
          {canBuy ? <Price paise={variant.price} className="text-lg" /> : <span className="text-lg font-extrabold text-ink-faint">—</span>}
          {hasDiscount && (
            <span className="text-[11px] text-ink-faint line-through tabular">
              ₹{Math.round(variant.mrp / 100)}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <AddControl product={product} variant={variant} disabled={!canBuy} />
        </div>
      </motion.article>

      <ProductDetailsModal
        product={product}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
});

ProductCard.displayName = 'ProductCard';

export { Price };
export default ProductCard;
