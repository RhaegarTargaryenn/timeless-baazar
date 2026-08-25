import React, { useState, useCallback, memo } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import useCartStore from '../store/cartStore';
import { formatPriceSimple } from '../utils/helpers';
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
  const getItemQuantity = useCartStore(state => state.getItemQuantity);

  const isComingSoon = product.priceStatus === 'coming_soon' || product.id >= 43;
  const currentPrice = product.price1kg;
  const originalPrice = currentPrice ? Math.round(currentPrice / 0.8) : 0; // Mock 20% discount
  const canPurchase = !isComingSoon && Number.isFinite(currentPrice) && currentPrice > 0;
  const inCartQuantity = getItemQuantity(product.id, '1kg');
  const discountPercent = canPurchase ? 20 : 0;

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
        {/* Product Image */}
        <div className="relative aspect-square bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-700 dark:via-green-900/20 dark:to-gray-800 overflow-hidden">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl sm:text-7xl opacity-20">
                {CATEGORY_EMOJI[product.category] ?? '🛒'}
              </span>
            </div>
          )}
          
          {/* Discount Badge */}
          {canPurchase && discountPercent > 0 && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                {discountPercent}%
              </span>
            </div>
          )}

          {/* In Cart Indicator */}
          {inCartQuantity > 0 && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1.5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {inCartQuantity}
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-3 sm:p-4">
          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
            {product.name}
          </h3>
          
          {/* Weight/Size */}
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
            1 kg.
          </p>

          {/* Price and Add Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                  {canPurchase ? formatPriceSimple(currentPrice) : 'Soon'}
                </span>
                {canPurchase && discountPercent > 0 && (
                  <span className="text-xs sm:text-sm text-gray-400 line-through">
                    {formatPriceSimple(originalPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Add Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                openModal();
              }}
              disabled={!canPurchase}
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

      {/* Product Details Modal */}
      <ProductDetailsModal
        product={product}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
