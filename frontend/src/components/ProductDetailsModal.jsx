import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Minus, Plus, ChevronDown, Heart } from './icons';
import toast from 'react-hot-toast';

import useCartStore from '../store/cartStore';
import { Price } from './ProductCard';
import { spring, tap, EASE } from '../lib/motion';
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
 * Product details, from the Figma source (node `1:682`).
 *
 * **Full screen**, as the design draws it — a `#F2F3F2` photo panel filling the
 * top with 25px bottom corners, then the copy on white, then the button pinned
 * to the foot. It was a small bottom sheet before, which squeezed the photo
 * into a thumbnail and made the whole screen read as a cramped popover.
 *
 * It is still an overlay rather than a route, so closing returns the customer
 * to the exact grid position they came from instead of re-mounting the list.
 * Rendered through a portal so it escapes the card's stacking context.
 */

/** The design's disclosure row: 16px semibold title, optional chip, chevron. */
const DisclosureRow = ({ title, chip, open, onToggle, children }) => (
  <div className="border-t border-line">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full h-[55px] flex items-center gap-3 text-left"
    >
      <span className="flex-1 text-[16px] font-semibold text-ink">{title}</span>
      {chip && (
        <span className="px-2 py-0.5 rounded-[5px] bg-surface-sunken text-[10px] font-semibold text-ink-muted">
          {chip}
        </span>
      )}
      <ChevronDown
        className={cx(
          'w-[18px] h-[18px] text-ink shrink-0 transition-transform duration-200',
          open ? 'rotate-180' : 'rotate-0'
        )}
      />
    </button>

    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="overflow-hidden"
        >
          <div className="pb-5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const ProductDetailsModal = memo(({ product, isOpen, onClose }) => {
  const variants = product?.variants ?? [];
  const images = product?.images ?? [];

  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [openRow, setOpenRow] = useState('detail');
  const [imageIndex, setImageIndex] = useState(0);
  const railRef = useRef(null);

  const addItem = useCartStore((state) => state.addItem);

  const variant =
    variants.find((v) => v._id === variantId) ?? variants[variants.length - 1] ?? null;

  // Reset on open so reopening never shows the previous session's state.
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setVariantId(null);
      setOpenRow('detail');
      setImageIndex(0);
    }
  }, [isOpen]);

  // The page behind must not scroll while this is over it.
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

  // The dots follow the rail rather than driving it, so a swipe and a dot
  // cannot disagree about which photo is showing.
  const onRailScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    setImageIndex(Math.round(rail.scrollLeft / rail.clientWidth));
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && product && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="fixed inset-0 z-50 bg-surface flex flex-col"
        >
          {/*
            The photo panel: `#F2F3F2`, 25px bottom corners, filling the top of
            the screen the way the design does. It shrinks on a short viewport
            so the button never gets pushed off.
          */}
          <div className="relative shrink-0 h-[42vh] min-h-[240px] max-h-[400px] bg-surface-sunken rounded-b-[25px]">
            <motion.button
              whileTap={tap}
              onClick={onClose}
              aria-label="Back"
              className="absolute top-[46px] left-[25px] z-10 w-10 h-10 -ml-2.5 -mt-2.5 flex items-center justify-center text-ink"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            {hasDiscount && (
              <span className="absolute top-[46px] right-[25px] z-10 px-2.5 py-1 rounded-full bg-coral text-white text-[11px] font-bold">
                {discountPercent}% off
              </span>
            )}

            {images.length > 0 ? (
              <div
                ref={railRef}
                onScroll={onRailScroll}
                className="h-full flex overflow-x-auto scrollbar-hide snap-row"
              >
                {images.map((src, index) => (
                  <div
                    key={src}
                    className="shrink-0 w-full h-full flex items-center justify-center px-10 pt-24 pb-14"
                  >
                    <img
                      src={src}
                      alt={index === 0 ? product.name : ''}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-8xl opacity-25">
                {CATEGORY_EMOJI[product.category?.slug] ?? '🛒'}
              </div>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {images.map((src, index) => (
                  <span
                    key={src}
                    className={cx(
                      'h-[5px] rounded-[15px] transition-all',
                      index === imageIndex ? 'w-[17px] bg-brand-600' : 'w-[5px] bg-ink/20'
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-[25px] pt-7">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-[24px] font-bold tracking-[0.1px] text-ink leading-[28px]">
                  {product.name}
                </h2>
                <p className="mt-2 text-[16px] text-ink-muted">
                  {[variant?.label, product.nameHindi].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <Heart className="w-6 h-6 shrink-0 mt-1 text-ink-faint" weight="regular" />
            </div>

            {/* Counter against the price, as the design weighs them */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={tap}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Reduce quantity"
                  className="text-ink-faint disabled:opacity-40"
                >
                  <Minus className="w-[18px] h-[18px]" />
                </motion.button>

                <span className="w-[46px] h-[46px] rounded-[17px] border border-line flex items-center justify-center">
                  <motion.span
                    key={quantity}
                    initial={{ y: -6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={spring.snappy}
                    className="text-[18px] font-semibold text-ink tabular"
                  >
                    {quantity}
                  </motion.span>
                </span>

                <motion.button
                  whileTap={tap}
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  aria-label="Increase quantity"
                  className="text-brand-600"
                >
                  <Plus className="w-[18px] h-[18px]" />
                </motion.button>
              </div>

              <div className="text-right">
                {canBuy ? (
                  <Price paise={variant.price} className="text-[24px] tracking-[0.1px]" />
                ) : (
                  <span className="text-[24px] font-bold text-ink-faint">—</span>
                )}
                {hasDiscount && (
                  <span className="block text-[13px] text-ink-faint line-through tabular">
                    ₹{Math.round(variant.mrp / 100)}
                  </span>
                )}
              </div>
            </div>

            {/*
              The design's three rows are Product Detail, Nutritions and Review.
              This shop stores no nutrition figures and collects no reviews, so
              those two are not drawn -- a row that opens onto nothing is worse
              than one row fewer. Sizes takes a slot instead, because a product
              here really does have several.
            */}
            <div className="mt-7">
              <DisclosureRow
                title="Product Detail"
                open={openRow === 'detail'}
                onToggle={() => setOpenRow((row) => (row === 'detail' ? null : 'detail'))}
              >
                <p className="text-[13px] leading-[21px] text-ink-muted">
                  {product.description ||
                    `${product.name}, weighed and packed by the shop on the day it ships.`}
                </p>
              </DisclosureRow>

              {variants.length > 1 && (
                <DisclosureRow
                  title="Sizes"
                  chip={variant?.label}
                  open={openRow === 'sizes'}
                  onToggle={() => setOpenRow((row) => (row === 'sizes' ? null : 'sizes'))}
                >
                  <div className="flex flex-wrap gap-2">
                    {variants.map((option) => {
                      const active = variant?._id === option._id;
                      return (
                        <motion.button
                          key={option._id}
                          whileTap={tap}
                          onClick={() => setVariantId(option._id)}
                          className={cx(
                            'relative h-11 px-4 rounded-[17px] border text-[14px] font-semibold transition-colors',
                            active ? 'border-brand-600 text-white' : 'border-line text-ink-muted'
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId={`size-${product._id}`}
                              transition={spring.layout}
                              className="absolute inset-0 rounded-[17px] bg-brand-600"
                            />
                          )}
                          <span className="relative">
                            {option.label}
                            <span className="ml-2 text-[13px] opacity-80 tabular">
                              ₹{Math.round(option.price / 100)}
                            </span>
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </DisclosureRow>
              )}

              <div className="border-t border-line" />
            </div>
          </div>

          {/* ── Add To Basket — pinned, as in the design ─────────────────── */}
          <div
            className="shrink-0 px-[25px] pt-4"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <motion.button
              whileTap={canBuy ? tap : undefined}
              onClick={handleAdd}
              disabled={!canBuy}
              className="w-full h-[67px] rounded-[19px] bg-brand-600 text-[#FFF9FF] text-[18px] font-semibold flex items-center justify-center gap-2 disabled:bg-surface-sunken disabled:text-ink-faint"
            >
              {canBuy ? (
                <>
                  Add To Basket
                  <span className="opacity-60">·</span>
                  <span className="tabular">
                    ₹{Math.round((variant.price * quantity) / 100)}
                  </span>
                </>
              ) : (
                'Not available'
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
});

ProductDetailsModal.displayName = 'ProductDetailsModal';

export default ProductDetailsModal;
