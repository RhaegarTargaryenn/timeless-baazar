import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { categories } from '../data/products';

const CategorySidebar = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div className="bg-gradient-to-br from-white to-orange-50/50 dark:from-gray-800 dark:to-orange-900/10 rounded-2xl p-5 shadow-soft-lg border-2 border-orange-100 dark:border-orange-900/30 sticky top-20 transition-all duration-300">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
        <span className="text-orange-500">📂</span>
        Categories
      </h2>
      
      <div className="space-y-2">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            whileHover={{ scale: 1.03, x: 4 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
              selectedCategory === category.id
                ? 'bg-gradient-to-r from-orange-500 to-accent-600 text-white shadow-glow'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-gray-600 border border-orange-100 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{category.icon}</span>
              <div>
                <div className="font-bold">{category.name}</div>
                <div className={`text-xs mt-0.5 ${
                  selectedCategory === category.id
                    ? 'text-white/90'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>{category.nameHindi}</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default memo(CategorySidebar);
