import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchX, WifiOff } from 'lucide-react';

import ProductCard from '../components/ProductCard';
import ForestHeader, { Sheet } from '../components/ForestHeader';
import { useProducts } from '../hooks/useProducts';
import { Skeleton, EmptyState, Button, cx } from '../components/ui';
import { gridContainer, pageIn, spring, tap } from '../lib/motion';

const GridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} className="border border-line rounded-card p-2.5">
        <Skeleton className="aspect-square rounded-xl mb-2" />
        <Skeleton className="h-3.5 w-4/5 mb-1.5" />
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-5 w-2/3 mb-2.5" />
        <Skeleton className="h-9 rounded-full" />
      </div>
    ))}
  </div>
);

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products, categories, loading, error, isStale, reload } = useProducts();

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('search') ?? '');
    setCategory(params.get('category') ?? 'all');
  }, [location.search]);

  const setParam = useCallback(
    (key, value) => {
      const params = new URLSearchParams(location.search);
      if (!value || value === 'all') params.delete(key);
      else params.set(key, value);
      navigate(`/products${params.toString() ? `?${params}` : ''}`, { replace: true });
    },
    [location.search, navigate]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (category !== 'all' && product.category?.slug !== category) return false;
      if (!query) return true;

      return (
        product.name.toLowerCase().includes(query) ||
        (product.nameHindi ?? '').includes(search.trim()) ||
        (product.category?.name ?? '').toLowerCase().includes(query)
      );
    });
  }, [products, category, search]);

  const chips = [{ slug: 'all', name: 'All' }, ...categories];

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      <ForestHeader
        showSearch
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setParam('search', value);
        }}
      >
        {/*
          Filter chips sit in the green, above the seam. Text-only rather than
          pills so they read as a secondary control against the search bar.
        */}
        <div className="flex gap-5 overflow-x-auto scrollbar-hide bleed mt-4 -mb-1">
          {chips.map((chip) => {
            const active = category === chip.slug;
            return (
              <motion.button
                key={chip.slug}
                whileTap={tap}
                onClick={() => setParam('category', chip.slug)}
                className={cx(
                  'relative shrink-0 pb-2 text-sm font-semibold whitespace-nowrap transition-colors',
                  active ? 'text-brand-400' : 'text-white/45'
                )}
              >
                {chip.name}
                {active && (
                  <motion.span
                    layoutId="chip-underline"
                    transition={spring.layout}
                    className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-brand-400"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </ForestHeader>

      <Sheet className="px-4 pt-5 pb-36 sm:pb-8">
        {/*
          Shown only when the API is unreachable but a cached catalogue is on
          screen. Render's free tier sleeps, so this is ordinary — a quiet line,
          not an error page.
        */}
        <AnimatePresence>
          {isStale && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3.5 py-2.5 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Showing recently saved prices — reconnecting.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <GridSkeleton />
        ) : error ? (
          <EmptyState
            icon={<WifiOff className="w-7 h-7" />}
            title="Could not load the shop"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchX className="w-7 h-7" />}
            title="Nothing matched"
            message={
              search
                ? `No products for "${search}". Try a shorter word.`
                : 'This category is empty right now.'
            }
            action={
              (search || category !== 'all') && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    navigate('/products', { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <p className="text-xs text-ink-faint mb-3">
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </p>
            <motion.div
              key={`${category}-${search}`}
              variants={gridContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {filtered.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </motion.div>
          </>
        )}
      </Sheet>
    </motion.div>
  );
};

export default Products;
