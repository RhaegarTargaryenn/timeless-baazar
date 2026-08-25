import { motion } from 'framer-motion';
import { HiTrash, HiPlus, HiMinus } from 'react-icons/hi';
import useCartStore from '../store/cartStore';
import { formatPriceSimple } from '../utils/helpers';

const CartItem = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();

  const handleIncrease = () => {
    updateQuantity(item.id, item.size, item.quantity + 1);
  };

  const handleDecrease = () => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.size, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    removeItem(item.id, item.size);
  };

  const subtotal = item.price * item.quantity;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-900/10 rounded-2xl p-5 border-2 border-orange-100 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/50 hover:shadow-soft-lg transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Product Image/Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">
              {item.category === 'daal' && '🥘'}
              {item.category === 'rice' && '🍚'}
              {item.category === 'flour' && '🌾'}
              {item.category === 'spices' && '🌶️'}
              {item.category === 'snacks' && '🍿'}
              {item.category === 'grocery' && '🛍️'}
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{item.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{item.nameHindi}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-400 px-2 py-1 rounded font-medium">
              {item.size}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatPriceSimple(item.price)} each
            </span>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3 sm:gap-2 justify-between sm:justify-start w-full sm:w-auto">
          <div className="flex items-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border-2 border-orange-200 dark:border-gray-500 transition-colors duration-300">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDecrease}
              className="p-2.5 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors duration-300"
            >
              <HiMinus className="w-4 h-4" />
            </motion.button>
            <span className="px-3 sm:px-4 text-gray-900 dark:text-white font-bold min-w-[2.5rem] sm:min-w-[3rem] text-center">
              {item.quantity}
            </span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleIncrease}
              className="p-2.5 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors duration-300"
            >
              <HiPlus className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Subtotal */}
          <div className="text-right min-w-[80px] sm:min-w-[100px]">
            <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-600 to-accent-600 bg-clip-text text-transparent">
              {formatPriceSimple(subtotal)}
            </div>
          </div>

          {/* Remove Button */}
          <motion.button
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRemove}
            className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-300 border-2 border-red-200 dark:border-red-800/50"
            aria-label="Remove item"
          >
            <HiTrash className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default CartItem;
