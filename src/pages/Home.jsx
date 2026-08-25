import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Truck, ShieldCheck, Wallet } from 'lucide-react';

import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import ForestHeader, { Sheet } from '../components/ForestHeader';
import { Skeleton } from '../components/ui';
import { gridContainer, gridItem, pageIn, spring, tap } from '../lib/motion';

const CATEGORY_EMOJI = {
  daal: '🥘',
  rice: '🍚',
  flour: '🌾',
  spices: '🌶️',
  snacks: '🍿',
  grocery: '🛍️',
};

const PROMISES = [
  { icon: Truck, label: 'Same-day delivery' },
  { icon: ShieldCheck, label: 'Fresh stock' },
  { icon: Wallet, label: 'Cash on delivery' },
];

const SectionHead = ({ title, to }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3">
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

  // Nothing is curated yet, so this is simply the shop's own ordering.
  const featured = products.slice(0, 6);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      <ForestHeader showSearch onSearchFocus={() => navigate('/products')} searchValue="">
        <div className="mt-4 text-center">
          <p className="text-[11px] text-white/50 font-medium">Delivering to</p>
          <p className="text-sm font-bold text-white inline-flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            Your doorstep
          </p>
        </div>

        {/*
          Category bubbles straddle the seam: they start in the green and are
          overlapped by the white sheet, which is what ties the two together.
        */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide bleed mt-4 pb-1">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="shrink-0 w-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10" />
                </div>
              ))
            : categories.map((category, index) => (
                <motion.button
                  key={category._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.snappy, delay: index * 0.04 }}
                  whileTap={tap}
                  onClick={() => navigate(`/products?category=${category.slug}`)}
                  className="shrink-0 w-16 text-center"
                >
                  <span className="block w-16 h-16 rounded-full bg-cream overflow-hidden ring-2 ring-white/15">
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
                  <span className="block mt-1.5 text-[10px] font-semibold text-white/85 leading-tight line-clamp-1">
                    {category.name}
                  </span>
                </motion.button>
              ))}
        </div>
      </ForestHeader>

      <Sheet className="px-4 pt-5 pb-28 sm:pb-8">
        <section className="grid grid-cols-3 gap-2 mb-6">
          {PROMISES.map(({ icon: Icon, label }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + index * 0.05, ...spring.snappy }}
              className="flex flex-col items-center gap-1.5 text-center px-1.5 py-3 rounded-2xl bg-surface-sunken"
            >
              <Icon className="w-5 h-5 text-brand-600" />
              <span className="text-[10px] font-semibold text-ink-muted leading-tight">
                {label}
              </span>
            </motion.div>
          ))}
        </section>

        <section className="mb-7">
          <SectionHead title="You might need" to="/products" />

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border border-line rounded-card p-2.5">
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
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {featured.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </motion.div>
          )}
        </section>

        <motion.section variants={gridItem} initial="initial" animate="animate">
          <div className="rounded-card bg-forest p-5 text-white">
            <h2 className="text-base font-bold text-white">
              Can't find what you need?
            </h2>
            <p className="text-sm text-white/70 mt-1 mb-4">
              Call the shop and we'll add it to your order.
            </p>
            <div className="flex flex-wrap gap-2">
              {['9266667069', '9654653719'].map((number) => (
                <motion.a
                  key={number}
                  whileTap={tap}
                  href={`tel:${number}`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/12 hover:bg-white/20 text-sm font-semibold transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {number}
                </motion.a>
              ))}
            </div>
          </div>
        </motion.section>

        <p className="text-center text-[11px] text-ink-faint mt-8">
          © {new Date().getFullYear()} Timeless Baazar
        </p>
      </Sheet>
    </motion.div>
  );
};

export default Home;
