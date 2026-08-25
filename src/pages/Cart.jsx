import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import useCartStore from '../store/cartStore';

const Cart = () => {
  const navigate = useNavigate();
  const { items } = useCartStore();

  useEffect(() => {
    // Only redirect if cart has items
    if (items.length > 0) {
      navigate('/checkout', { replace: true });
    }
  }, [items.length, navigate]);

  // Show empty cart UI if no items
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          {/* Empty Cart Illustration */}
          <div className="mb-8 flex justify-center">
            <img 
              src="/cart.png" 
              alt="Empty Cart" 
              className="w-64 h-64 object-contain"
            />
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            YOUR SHOPPING CART IS EMPTY
          </h1>

          {/* Subtext */}
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm sm:text-base">
            looks like you have no items in your shopping cart
          </p>

          {/* Continue Shopping Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 border-2 border-red-500 text-red-500 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-md hover:shadow-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            CONTINUE SHOPPING
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // If has items, show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirecting to checkout...</p>
      </div>
    </div>
  );
};

export default Cart;
