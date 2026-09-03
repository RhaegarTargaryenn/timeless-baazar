import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SearchX, WifiOff, SlidersHorizontal, X } from '../components/icons';

import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { Skeleton, EmptyState, Button, WakingNotice, cx } from '../components/ui';
import PageHeader from '../components/PageHeader';
import { gridContainer, pageIn, spring, tap } from '../lib/motion';
import { tintFor } from '../lib/categoryTints';

/**
 * Explore, from the Figma source — two screens on one route.
 *
 * With nothing selected it is "Find Products" (node `1:749`): a centred title,
 * the search field, and a two-column grid of tinted category tiles. Pick one
 * and it becomes the category screen (node `1:862`): back arrow, the category's
 * name as the title, a filter control, and a two-column grid of the same
 * product cards Home uses.
 *
 * Which one shows is driven entirely by the URL, so the back arrow, a shared
 * link and the browser's own back button all agree.
 */

const GUTTER = 'px-[25px]';

/** Search: 51.5px at radius 15 on `#F2F3F2`, exactly as Home draws it. */
const SearchField = ({ value, onChange }) => (
  <div className="relative">
    <Search
      className="absolute left-[15px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-muted pointer-events-none"
    />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search Store"
      className="w-full h-[51.5px] pl-[45px] pr-10 rounded-[15px] bg-surface-sunken text-[14px] font-semibold text-ink placeholder:text-ink-muted placeholder:font-semibold focus:outline-none focus:ring-2 focus:ring-brand-600/30"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-ink-muted"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

const GridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[15px]">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="h-[248px] p-[15px] border border-line rounded-card">
        <Skeleton className="h-[100px] rounded-xl" />
        <Skeleton className="h-4 w-4/5 mt-3" />
        <Skeleton className="h-3.5 w-1/2 mt-2" />
        <Skeleton className="h-[46px] w-[46px] rounded-[17px] ml-auto mt-6" />
      </div>
    ))}
  </div>
);

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products, categories, loading, error, isStale, waking, reload } = useProducts();

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('search') ?? '');
    setCategory(params.get('category') ?? 'all');
    setFilterOpen(false);
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

  // Browsing is the state with no category and no query. Anything else is a
  // result list, and gets the back arrow and the category's own title.
  const browsing = category === 'all' && !search.trim();
  const activeCategory = categories.find((item) => item.slug === category);
  const title = browsing
    ? 'Find Products'
    : activeCategory?.name ?? (search.trim() ? `"${search.trim()}"` : 'Products');

  /*
   * Shown only when the API is unreachable but a cached catalogue is on screen.
   * Render's free tier sleeps, so this is ordinary — a quiet line, not an error
   * page.
   */
  const staleBanner = (
    <AnimatePresence>
      {isStale && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3.5 py-2.5 mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Showing recently saved prices — reconnecting.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface pb-32 sm:pb-10">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      {/*
        Inside a category, back means the category grid -- not wherever history
        happens to point, which after a filter change is the same screen again.
      */}
      <PageHeader
        title={title}
        onBack={browsing ? undefined : () => navigate('/products')}
        className="pb-1"
        right={
          !browsing && (
            <motion.button
              whileTap={tap}
              onClick={() => setFilterOpen((open) => !open)}
              aria-label="Filter by category"
              aria-expanded={filterOpen}
              className={cx(
                'w-10 h-10 flex items-center justify-center transition-colors',
                filterOpen ? 'text-brand-600' : 'text-ink'
              )}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
            </motion.button>
          )
        }
      />

      {/*
        The filter is a category switcher, not a new faceted-search feature:
        being in one category and wanting the next one is the only filtering
        this catalogue supports today.
      */}
      <AnimatePresence initial={false}>
        {filterOpen && !browsing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-[25px] pt-4 pb-1">
              {[{ slug: 'all', name: 'All' }, ...categories].map((option) => {
                const active = category === option.slug;
                return (
                  <motion.button
                    key={option.slug}
                    whileTap={tap}
                    onClick={() => setParam('category', option.slug)}
                    className={cx(
                      'relative shrink-0 h-10 px-4 rounded-[15px] border text-[14px] font-semibold whitespace-nowrap transition-colors',
                      active ? 'border-brand-600 text-white' : 'border-line text-ink-muted'
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="filter-pill"
                        transition={spring.layout}
                        className="absolute inset-0 rounded-[15px] bg-brand-600"
                      />
                    )}
                    <span className="relative">{option.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search — only on the browse screen, as the design places it ──── */}
      {browsing && (
        /*
          Capped and centred from `sm` up. Stretched across the full column a
          search box is a 974px-wide input holding a 14px word, which reads as a
          gap in the page rather than a control -- and it sits under a centred
          title, so centring it keeps the two on one axis.
        */
        <div className={cx('mt-6 sm:mt-5', GUTTER)}>
          <div className="sm:max-w-md sm:mx-auto">
            <SearchField value={search} onChange={(value) => setParam('search', value)} />
          </div>
        </div>
      )}

      <div className={cx('mt-5', GUTTER)}>
        {staleBanner}

        {waking && loading ? (
          <WakingNotice />
        ) : loading ? (
          <GridSkeleton />
        ) : error ? (
          <EmptyState
            icon={<WifiOff className="w-7 h-7" />}
            title="Could not load the shop"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        ) : browsing ? (
          /* ── Category tiles (node 1:749) ───────────────────────────── */
          <motion.div
            variants={gridContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[15px]"
          >
            {categories.map((item, index) => {
              const tint = tintFor(index);
              return (
                <motion.button
                  key={item._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.snappy, delay: Math.min(index, 7) * 0.04 }}
                  whileTap={tap}
                  onClick={() => setParam('category', item.slug)}
                  style={{ backgroundColor: tint.bg, borderColor: tint.border }}
                  className="h-[189px] rounded-card border flex flex-col items-center justify-center gap-3 px-3"
                >
                  <span className="h-[75px] flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="max-h-[75px] max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-4xl">🛒</span>
                    )}
                  </span>
                  <span className="text-[16px] font-bold tracking-[0.1px] leading-[22px] text-ink text-center">
                    {item.name}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
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
              <Button variant="secondary" onClick={() => navigate('/products')}>
                Back to categories
              </Button>
            }
          />
        ) : (
          /* ── Product grid (node 1:862) ─────────────────────────────── */
          <motion.div
            key={`${category}-${search}`}
            variants={gridContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[15px]"
          >
            {filtered.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Products;
