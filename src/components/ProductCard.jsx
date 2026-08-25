import React, { useState, useCallback, memo } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '../store/cartStore';
import { formatRupees } from '../lib/api';
import ProductDetailsModal from './ProductDetailsModal';

const CATEGORY_EMOJI = {
  daal: '🥘',
  rice: '🍚',
  flour: '🌾',
  spices: '🌶️',
  snacks: '🍿',
  grocery: '🛍️',
};

const ProductCard = memo(({ product }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const items = useCartStore((state) => state.items);

  // The API already strips variants the shop has marked out of stock, so
  // anything still here is buyable.
  const variants = product.variants ?? [];
  const defaultVariant = variants[variants.length - 1] ?? null; // the larger size
  const canPurchase = Boolean(defaultVariant);

  const inCartQuantity = items
    .filter((item) => item.productId === product._id)
    .reduce((total, item) => total + item.quantity, 0);

  /**
   * A discount badge only when the shop entered a real list price.
   *
   * This used to be `price / 0.8` with a hardcoded "20%" on every product —
   * a made-up saving shown to every customer on every item.
   */
  const hasDiscount =
    defaultVariant?.mrp != null && defaultVariant.mrp > defaultVariant.price;
  const discountPercent = hasDiscount
    ? Math.round(((defaultVariant.mrp - defaultVariant.price) / defaultVariant.mrp) * 100)
    : 0;

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        transition={{ duration: 0.3 }}
        onClick={openModal}
        className="cursor-pointer bg-white dark:bg-gray-800 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-smooth-lg hover:border-green-200 dark:hover:border-green-700/50 shadow-smooth transition-all duration-300"
      >
        <div className="relative aspect-square bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-700 dark:via-green-900/20 dark:to-gray-800 overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl sm:text-7xl opacity-20">
                {CATEGORY_EMOJI[product.category?.slug] ?? '🛒'}
              </span>
            </div>
          )}

          {hasDiscount && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                {discountPercent}%
              </span>
            </div>
          )}

          {inCartQuantity > 0 && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1.5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {inCartQuantity}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
            {product.name}
          </h3>

          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
            {defaultVariant?.label ?? 'Unavailable'}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  {canPurchase ? formatRupees(defaultVariant.price) : 'Soon'}
                </span>
                {hasDiscount && (
                  <span className="text-xs sm:text-sm text-gray-400 line-through">
                    {formatRupees(defaultVariant.mrp)}
                  </span>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
              disabled={!canPurchase}
              aria-label={`Add ${product.name} to cart`}
              className={`p-2.5 sm:p-3 rounded-full transition-all ${
                canPurchase
                  ? 'bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <ProductDetailsModal product={product} isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
