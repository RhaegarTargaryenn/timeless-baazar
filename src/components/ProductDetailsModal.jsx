import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart, Zap, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import useCartStore from '../store/cartStore';
import { Price } from './ProductCard';
import { sheetMotion, spring, tap, fade } from '../lib/motion';
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
 * Product details, as a bottom sheet.
 *
 * A sheet rather than a route so the grid stays behind it — after adding, the
 * customer is back where they were instead of navigating twice. Rendered
 * through a portal so it escapes the card's stacking context.
 */
const ProductDetailsModal = memo(({ product, isOpen, onClose }) => {
  const variants = product?.variants ?? [];
  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((state) => state.addItem);

  const variant =
    variants.find((v) => v._id === variantId) ?? variants[variants.length - 1] ?? null;

  // Reset on open so reopening never shows the previous session's state.
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setVariantId(null);
    }
  }, [isOpen]);

  // A sheet over a page that also scrolls is disorienting.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const canBuy = Boolean(variant);
  const hasDiscount = variant?.mrp != null && variant.mrp > variant.price;
  const discountPercent = hasDiscount
    ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
    : 0;

  const handleAdd = () => {
    if (!canBuy) return;
    addItem(product, variant, quantity);
    toast.success(`${quantity} × ${product.name} added`);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            {...fade}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-hidden
          />

          <motion.div
            {...sheetMotion}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            // Dragging the sheet down past a threshold, or flicking it, closes
            // it — the gesture people already expect from a sheet.
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="relative w-full sm:max-w-md bg-forest rounded-t-sheet sm:rounded-sheet overflow-hidden max-h-[94vh] flex flex-col"
          >
            {/* Forest strip, matching the page header */}
            <div className="shrink-0 px-4 pt-3 pb-4">
              <div className="sm:hidden flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={tap}
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-5 h-5" />
                </motion.button>
                <h2 className="flex-1 text-center text-base font-bold text-white">
                  Product Details
                </h2>
                <span className="w-10 shrink-0" />
              </div>
            </div>

            {/* White sheet cutting into the green */}
            <div className="flex-1 min-h-0 -mt-1 rounded-t-seam bg-surface flex flex-col">
              <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
                <div className="w-full aspect-[4/3] rounded-card bg-surface-sunken overflow-hidden mb-4">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-7xl opacity-25">
                      {CATEGORY_EMOJI[product.category?.slug] ?? '🛒'}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-extrabold text-ink leading-tight">
                  {product.name}
                </h3>
                {product.nameHindi && (
                  <p className="text-sm text-ink-muted mt-0.5">{product.nameHindi}</p>
                )}
                <p className="text-xs text-ink-faint mt-1">{variant?.label}</p>

                <div className="flex items-center justify-between gap-3 mt-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {canBuy ? (
                      <Price paise={variant.price} className="text-2xl" />
                    ) : (
                      <span className="text-2xl font-extrabold text-ink-faint">—</span>
                    )}
                    {hasDiscount && (
                      <>
                        <span className="text-sm text-ink-faint line-through tabular">
                          ₹{Math.round(variant.mrp / 100)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-coral text-white text-[11px] font-bold">
                          {discountPercent}% off
                        </span>
                      </>
                    )}
                  </div>

                  {canBuy && (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Fast delivery
                    </span>
                  )}
                </div>

                {variants.length > 1 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-ink-muted mb-2">Choose size</p>
                    <div className="flex gap-2 flex-wrap">
                      {variants.map((option) => {
                        const active = variant?._id === option._id;
                        return (
                          <motion.button
                            key={option._id}
                            whileTap={tap}
                            onClick={() => setVariantId(option._id)}
                            className={cx(
                              'relative px-4 h-11 rounded-2xl text-sm font-semibold border transition-colors',
                              active
                                ? 'border-brand-600 text-white'
                                : 'bg-surface-raised border-line text-ink-muted'
                            )}
                          >
                            {active && (
                              <motion.span
                                layoutId={`size-${product._id}`}
                                transition={spring.layout}
                                className="absolute inset-0 rounded-2xl bg-brand-600"
                              />
                            )}
                            <span className="relative">
                              {option.label}
                              <span className="ml-2 text-xs opacity-80 tabular">
                                ₹{Math.round(option.price / 100)}
                              </span>
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.description && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-ink-muted mb-1">About</p>
                    <p className="text-sm text-ink-muted leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-5 text-xs text-ink-faint">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  Packed fresh by the shop on the day it ships
                </div>
              </div>

              {/* Action bar stays put while the content above scrolls */}
              <div
                className="shrink-0 border-t border-line bg-surface px-5 pt-3 flex items-center gap-3"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <div className="shrink-0 inline-flex items-center gap-1 bg-surface-sunken rounded-full p-1">
                  <motion.button
                    whileTap={tap}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Reduce quantity"
                    className="w-9 h-9 rounded-full bg-surface-raised border border-line flex items-center justify-center text-ink disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.span
                    key={quantity}
                    initial={{ y: -6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={spring.snappy}
                    className="w-8 text-center text-base font-bold text-ink tabular"
                  >
                    {quantity}
                  </motion.span>
                  <motion.button
                    whileTap={tap}
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    aria-label="Increase quantity"
                    className="w-9 h-9 rounded-full bg-surface-raised border border-line flex items-center justify-center text-ink"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>

                <motion.button
                  whileTap={canBuy ? tap : undefined}
                  onClick={handleAdd}
                  disabled={!canBuy}
                  className="flex-1 h-12 rounded-full bg-brand-600 text-white font-bold text-sm shadow-brand flex items-center justify-center gap-2 disabled:bg-surface-sunken disabled:text-ink-faint disabled:shadow-none"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {canBuy ? (
                    <>
                      Add to cart
                      <span className="opacity-70">·</span>
                      <span className="tabular">₹{Math.round((variant.price * quantity) / 100)}</span>
                    </>
                  ) : (
                    'Not available'
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
});

ProductDetailsModal.displayName = 'ProductDetailsModal';

export default ProductDetailsModal;
