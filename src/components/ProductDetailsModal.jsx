import React, { useState, memo } from 'react';
import { X, ShoppingCart, Plus, Minus, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import { formatPriceSimple } from '../utils/helpers';

const CATEGORY_EMOJI = { daal: '🥘', rice: '🍚', flour: '🌾', spices: '🌶️', snacks: '🍿', grocery: '🛍️' };
const SIZES = [{ value: '1kg', label: '1 Kg' }, { value: '500g', label: '500g' }];

const ProductDetailsModal = memo(({ product, isOpen, onClose }) => {
  const [selectedSize, setSelectedSize] = useState('1kg');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const addItem = useCartStore(state => state.addItem);

  const isComingSoon = product?.priceStatus === 'coming_soon' || product?.id >= 43;
  const currentPrice = selectedSize === '1kg' ? product?.price1kg : product?.price500g;
  const originalPrice = currentPrice ? Math.round(currentPrice / 0.8) : 0; // Mock 20% discount
  const canPurchase = !isComingSoon && Number.isFinite(currentPrice) && currentPrice > 0;

  const handleAddToCart = () => {
    if (!canPurchase) {
      toast.error('Price coming soon for this item');
      return;
    }

    addItem(product, quantity, selectedSize);
    toast.success(`${product.name} added to cart!`, {
      icon: '🛒',
      duration: 1500,
      style: {
        background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
        color: '#166534',
        border: '2px solid #22C55E',
        borderRadius: '20px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 10px 40px -10px rgba(34, 197, 94, 0.4)',
      },
    });
    onClose();
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-[32px] shadow-2xl max-h-[95vh] overflow-hidden"
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Product Details</h2>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-140px)] px-6 pb-6">
              {/* Product Image */}
              <div className="relative w-full h-44 sm:h-56 max-w-sm mx-auto my-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 rounded-3xl overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    {CATEGORY_EMOJI[product.category] ?? '🛍️'}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                {/* Name and Favorite */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {product.name} {selectedSize}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{product.nameHindi}</p>
                  </div>
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Availability */}
                {canPurchase && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Available on fast delivery
                    </span>
                  </div>
                )}

                {/* Price and Rating */}
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {canPurchase ? formatPriceSimple(currentPrice) : 'Soon'}
                    </span>
                    {canPurchase && (
                      <>
                        <span className="text-lg text-gray-400 line-through">
                          {formatPriceSimple(originalPrice)}
                        </span>
                        <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                          20%
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      4.5 Rating
                    </span>
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Select Size
                  </label>
                  <div className="flex gap-3">
                    {SIZES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedSize(value)}
                        className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all ${
                          selectedSize === value
                            ? 'bg-green-600 text-white shadow-smooth'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-2xl p-2 max-w-xs">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={!canPurchase || quantity <= 1}
                      className="p-3 hover:bg-white dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-40"
                    >
                      <Minus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <span className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={!canPurchase}
                      className="p-3 hover:bg-white dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {product.description || `${product.name} offers a deliciously ${
                      product.category === 'daal' ? 'protein-rich' : 'fresh'
                    } experience. Made from high-quality ingredients, ${
                      product.nameHindi
                    } delivers a perfect balance of taste and nutrition.`}
                    <button className="text-green-600 dark:text-green-400 font-semibold ml-1">
                      Read More
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-6 py-4">
              <motion.button
                whileHover={{ scale: canPurchase ? 1.02 : 1 }}
                whileTap={{ scale: canPurchase ? 0.98 : 1 }}
                onClick={handleAddToCart}
                disabled={!canPurchase}
                className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  canPurchase
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-smooth'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {canPurchase ? 'Add To Cart' : 'Coming Soon'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default ProductDetailsModal;
