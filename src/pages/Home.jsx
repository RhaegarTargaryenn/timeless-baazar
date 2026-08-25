import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Search, ShoppingCart, Phone, ChevronRight } from 'lucide-react';

import { useProducts } from '../hooks/useProducts';
import useCartStore from '../store/cartStore';
import ProductCard from '../components/ProductCard';
import ScallopedSeam from '../components/ScallopedSeam';
import { Skeleton } from '../components/ui';
import { gridContainer, pageIn, spring, tap } from '../lib/motion';

const CATEGORY_EMOJI = {
  daal: '🥘',
  rice: '🍚',
  flour: '🌾',
  spices: '🌶️',
  snacks: '🍿',
  grocery: '🛍️',
};

/**
 * The two promo tiles under the product row.
 *
 * Warm pastels against all the green — the one place on the page that is not
 * brand-coloured, so it reads as an offer rather than more navigation.
 */
const PROMOS = [
  {
    title: 'Everyday grocery',
    sub: 'Order by 12:15 pm',
    foot: 'Free delivery',
    className: 'bg-cream',
    to: '/products?category=grocery',
  },
  {
    title: 'Bulk & wholesale',
    sub: 'Order by 1:30 pm',
    foot: 'Call to arrange',
    className: 'bg-rose-100 dark:bg-rose-950/40',
    to: '/products?category=daal',
  },
];

const SectionHead = ({ title, to }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3 px-4">
    <h2 className="text-[17px] font-extrabold text-ink">{title}</h2>
    {to && (
      <Link to={to} className="text-[13px] font-semibold text-coral shrink-0">
        See more
      </Link>
    )}
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const { products, categories, loading } = useProducts();

  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  // Nothing is curated yet, so this is simply the shop's own ordering.
  const featured = products.slice(0, 8);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      {/* ── Forest header ────────────────────────────────────────────────── */}
      <div className="relative bg-forest pt-3">
        <div className="px-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/products')}
            className="relative flex-1 h-12 pl-11 pr-4 rounded-full bg-white text-left text-sm text-forest/40"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-forest/50" />
            Search for "Grocery"
          </button>

          <Link to="/cart" className="relative shrink-0" aria-label="Cart">
            <motion.span
              whileTap={tap}
              className="flex w-12 h-12 rounded-full bg-white items-center justify-center text-forest"
            >
              <ShoppingCart className="w-5 h-5" />
            </motion.span>
            {cartCount > 0 && (
              <motion.span
                key={cartCount}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={spring.snappy}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-forest"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </motion.span>
            )}
          </Link>
        </div>

        <div className="text-center mt-3">
          <p className="text-[11px] text-white/45 font-medium">Delivering to</p>
          <p className="text-sm font-bold text-brand-400 inline-flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            Your doorstep
          </p>
        </div>

        {/*
          Bubbles alternate up and down so they sit along the crest and trough
          of the scallop below, rather than in a flat line across it.
        */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 mt-4 pb-4">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="shrink-0 w-[60px]">
                  <div className="w-[60px] h-[60px] rounded-full bg-white/10" />
                </div>
              ))
            : categories.map((category, index) => (
                <motion.button
                  key={category._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.snappy, delay: index * 0.05 }}
                  whileTap={tap}
                  onClick={() => navigate(`/products?category=${category.slug}`)}
                  // The gentle stagger follows the scallop's crest and trough
                  // without pushing any label down into it.
                  className={`shrink-0 w-[62px] text-center ${index % 2 === 1 ? 'pt-3' : ''}`}
                >
                  <span className="block w-[58px] h-[58px] mx-auto rounded-full bg-cream overflow-hidden ring-[3px] ring-white/10">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-2xl">
                        {CATEGORY_EMOJI[category.slug] ?? '🛒'}
                      </span>
                    )}
                  </span>
                  <span className="block mt-1.5 text-[10px] font-semibold text-white/80 leading-tight line-clamp-1">
                    {category.name}
                  </span>
                </motion.button>
              ))}
        </div>

        {/* The scalloped edge of the white sheet, cutting into the green */}
        <ScallopedSeam
          count={8}
          depth={30}
          className="block w-full h-8 -mb-px text-surface"
          fill="currentColor"
        />
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="bg-surface pt-4 pb-32 sm:pb-8">
        <SectionHead title="You might need" to="/products" />

        {/*
          A horizontal rail, not a grid. It shows the catalogue continues past
          the edge of the screen, which a two-column grid cut off at four items
          does not.
        */}
        {loading ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="shrink-0 w-[150px] border border-line rounded-card p-2.5">
                <Skeleton className="aspect-square rounded-xl mb-2" />
                <Skeleton className="h-3.5 w-4/5 mb-1.5" />
                <Skeleton className="h-5 w-1/2 mb-2.5" />
                <Skeleton className="h-9 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={gridContainer}
            initial="initial"
            animate="animate"
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-row px-4 pb-1"
          >
            {featured.map((product) => (
              <div key={product._id} className="shrink-0 w-[150px]">
                <ProductCard product={product} />
              </div>
            ))}

            <Link
              to="/products"
              className="shrink-0 w-[110px] flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line text-ink-muted"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-xs font-semibold">See all</span>
            </Link>
          </motion.div>
        )}

        {/* Promos */}
        <div className="grid grid-cols-2 gap-3 px-4 mt-6">
          {PROMOS.map((promo, index) => (
            <motion.button
              key={promo.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.snappy, delay: 0.1 + index * 0.06 }}
              whileTap={tap}
              onClick={() => navigate(promo.to)}
              className={`text-left p-4 rounded-card ${promo.className}`}
            >
              <p className="text-sm font-extrabold text-forest">{promo.title}</p>
              <p className="text-[11px] text-forest/60 mt-0.5">{promo.sub}</p>
              <p className="text-[11px] font-bold text-forest/80 mt-3">{promo.foot}</p>
            </motion.button>
          ))}
        </div>

        {/* Contact — a real shop, and customers do phone it */}
        <div className="px-4 mt-6">
          <div className="rounded-card bg-forest p-5">
            <h2 className="text-base font-bold text-white">Can't find what you need?</h2>
            <p className="text-sm text-white/60 mt-1 mb-4">
              Call the shop and we'll add it to your order.
            </p>
            <div className="flex flex-wrap gap-2">
              {['9266667069', '9654653719'].map((number) => (
                <motion.a
                  key={number}
                  whileTap={tap}
                  href={`tel:${number}`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/12 text-white text-sm font-semibold"
                >
                  <Phone className="w-4 h-4" />
                  {number}
                </motion.a>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-faint mt-8">
          © {new Date().getFullYear()} Timeless Baazar
        </p>
      </div>
    </motion.div>
  );
};

export default Home;
