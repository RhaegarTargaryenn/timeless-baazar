import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-100 dark:bg-gray-700" />
    <div className="p-3 sm:p-4 space-y-2">
      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-1/2 mt-3" />
    </div>
  </div>
);

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products, categories, loading, error, isStale, reload } = useProducts();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('search') ?? '');
    setSelectedCategory(params.get('category') ?? 'all');
  }, [location.search]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (selectedCategory !== 'all' && product.category?.slug !== selectedCategory) {
        return false;
      }
      if (!query) return true;

      return (
        product.name.toLowerCase().includes(query) ||
        (product.nameHindi ?? '').includes(searchQuery.trim()) ||
        (product.category?.name ?? '').toLowerCase().includes(query)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const handleCategoryChange = useCallback(
    (categorySlug) => {
      const params = new URLSearchParams(location.search);
      if (categorySlug === 'all') params.delete('category');
      else params.set('category', categorySlug);
      navigate(`/products?${params.toString()}`);
    },
    [location.search, navigate]
  );

  const chips = [{ slug: 'all', name: 'All Products' }, ...categories];
  const currentName =
    searchQuery || chips.find((c) => c.slug === selectedCategory)?.name || 'All Products';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/*
          Shown only when the API could not be reached but a cached catalogue
          is on screen. Render's free tier sleeps, so this is a normal state —
          worth a quiet note, not an error page.
        */}
        {isStale && (
          <div className="mb-4 flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Showing recently saved prices — reconnecting.
            </p>
          </div>
        )}

        <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {chips.map((category) => (
              <motion.button
                key={category.slug}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCategoryChange(category.slug)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === category.slug
                    ? 'bg-green-600 text-white shadow-smooth'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                {category.name}
              </motion.button>
            ))}
          </div>
        </div>

        {!loading && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Results for "{currentName}"</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}

        <main>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Could not load the shop
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{error}</p>
              <button
                onClick={reload}
                className="px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl"
              >
                Try again
              </button>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {filtered.map((product, index) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.02 }}
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
