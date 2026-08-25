import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import { getProductsByCategory, searchProducts, categories } from '../data/products';

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle search and category from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search');
    const category = params.get('category');
    
    if (query) {
      setSearchQuery(query);
    }
    
    if (category) {
      setSelectedCategory(category);
    } else {
      setSelectedCategory('all');
    }
  }, [location.search]);

  // Filter products based on category and search
  const filteredProducts = useMemo(() => {
    let result = getProductsByCategory(selectedCategory);
    
    if (searchQuery.trim()) {
      result = searchProducts(searchQuery);
      if (selectedCategory !== 'all') {
        result = result.filter(p => p.category === selectedCategory);
      }
    }
    
    return result;
  }, [selectedCategory, searchQuery]);

  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    const params = new URLSearchParams(location.search);
    if (categoryId === 'all') {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    navigate(`/products?${params.toString()}`);
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Header */}
        {searchQuery && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Search
            </h2>
          </motion.div>
        )}

        {/* Category Chips */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-green-600 text-white shadow-smooth'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                {category.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Results for "{searchQuery || categories.find(c => c.id === selectedCategory)?.name || 'All Products'}"
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </p>
        </motion.div>

        {/* Products Grid */}
        <main>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div 
                  key={`${product.id}-${product.category}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No products found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or category filter
              </p>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Products;
