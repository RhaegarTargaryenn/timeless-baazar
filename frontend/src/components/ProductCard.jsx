import React, { useState, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus } from './icons';

import useCartStore from '../store/cartStore';
import ProductDetailsModal from './ProductDetailsModal';
import { spring, tap, gridItem } from '../lib/motion';
import { cx } from './ui';

/**
 * The product card from the Figma source (node 1:59 and its siblings).
 *
 * Geometry is the design's, converted from absolute positioning to flow:
 * 173 x 248 at radius 18, a 1px `#E2E2E2` hairline and no fill, 15px of inset,
 * the photo floating on white rather than in a tinted tile, then name (16px
 * bold), unit (14px muted), and a baseline row of price against a 46px green
 * add button.
 *
 * Height is fixed so a two-word name and a four-word one still line their
 * prices up across a row.
 */

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
    <span className={cx('font-bold text-ink tabular leading-none', className)}>
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
 * The add control.
 *
 * At rest it is the design's 46px rounded-square (radius 17) in brand green.
 * Once the item is in the cart the same shape stretches into a − 1 + stepper;
 * `layout` on the shared container makes that one continuous shape change
 * rather than one element swapping for another.
 *
 * `compact` drops it to 38px for the three-across Popular Picks row, where the
 * full size leaves no room for a price beside it on a 320px phone. Nothing
 * else changes -- same behaviour, same motion.
 */
const AddControl = ({ product, variant, disabled, compact = false }) => {
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
      <div
        className={cx(
          'rounded-[17px] bg-surface-sunken flex items-center justify-center text-ink-faint shrink-0',
          compact ? 'w-[38px] h-[38px]' : 'w-[46px] h-[46px]'
        )}
      >
        <Plus className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
      </div>
    );
  }

  return (
    <motion.div
      layout
      transition={layoutTransition}
      className={cx(
        'rounded-[17px] bg-brand-600 flex items-center justify-center overflow-hidden shrink-0',
        compact ? 'h-[38px]' : 'h-[46px]'
      )}
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
            className={cx(
              'h-full flex items-center justify-center text-white',
              compact ? 'w-[38px]' : 'w-[46px]'
            )}
          >
            <Plus className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </motion.button>
        ) : (
          <motion.div
            key="stepper"
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={layoutTransition}
            className="h-full flex items-center gap-0.5 px-1.5 text-white"
          >
            <motion.button
              whileTap={tap}
              onClick={(event) => {
                stop(event);
                updateQuantity(product._id, variant._id, quantity - 1);
              }}
              aria-label="Reduce quantity"
              className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5" />
            </motion.button>

            <motion.span
              key={quantity}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={spring.snappy}
              className="min-w-[20px] text-center text-sm font-bold tabular"
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
              className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
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
        className={cx(
          'flex flex-col h-[248px] p-[15px] bg-surface-raised border border-line rounded-card cursor-pointer',
          !canBuy && 'opacity-45'
        )}
      >
        {/*
          The photo floats on the card. The design has cut-outs on transparent
          backgrounds; the shop's photos are bowls on near-white, so `contain`
          keeps them from being cropped into a different composition.
        */}
        <div className="relative h-[100px] rounded-xl overflow-hidden flex items-center justify-center">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="text-4xl opacity-25">
              {CATEGORY_EMOJI[product.category?.slug] ?? '🛒'}
            </div>
          )}

          {hasDiscount && (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-coral text-white text-[10px] font-bold">
              {discountPercent}% off
            </span>
          )}
        </div>

        <h3 className="mt-3 text-[16px] font-bold leading-[18px] tracking-[0.1px] text-ink line-clamp-2 min-h-[36px]">
          {product.name}
        </h3>

        <p className="mt-1.5 text-[14px] leading-[18px] text-ink-muted line-clamp-1">
          {variant?.label ?? product.nameHindi ?? product.category?.name ?? '—'}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            {canBuy ? (
              <Price paise={variant.price} className="text-[18px]" />
            ) : (
              <span className="text-[18px] font-bold text-ink-faint">—</span>
            )}
            {hasDiscount && (
              <span className="block text-[11px] text-ink-faint line-through tabular">
                ₹{Math.round(variant.mrp / 100)}
              </span>
            )}
          </div>

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

export { Price, AddControl };
export default ProductCard;
