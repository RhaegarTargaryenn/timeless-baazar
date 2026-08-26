import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import { Search, MapPin } from 'lucide-react';
import { Skeleton, cx } from '../components/ui';
import { gridContainer, pageIn, spring, tap } from '../lib/motion';
import { tintFor } from '../lib/categoryTints';

/**
 * Home, built from the Figma source (node 1:45, "Home Screen").
 *
 * The design's order is: brand mark and location, a search field, a promo
 * banner, then three titled rails -- Exclusive Offer, Best Selling, Groceries.
 * Everything is on white; the only fills are the search field, the banner and
 * the tinted category tiles.
 *
 * Measurements are the design's: a 25px page gutter, 51.5px search field at
 * radius 15, a 115px banner at radius 8, 24px section titles against a 16px
 * green "See all", and 173px-wide product cards with a 15px gap.
 */

const CATEGORY_EMOJI = {
  daal: '🥘',
  rice: '🍚',
  flour: '🌾',
  spices: '🌶️',
  snacks: '🍿',
  grocery: '🛍️',
};

const GUTTER = 'px-[25px]';

const SectionHead = ({ title, to }) => (
  <div className={cx('flex items-center justify-between gap-3', GUTTER)}>
    <h2 className="text-[24px] font-semibold text-ink">{title}</h2>
    {to && (
      <Link to={to} className="shrink-0 text-[16px] font-semibold text-brand-600">
        See all
      </Link>
    )}
  </div>
);

/**
 * A horizontal rail of product cards.
 *
 * A rail rather than a grid, as in the design: it shows the catalogue carries
 * on past the edge of the screen, which a grid cut off at four items does not.
 */
const ProductRail = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="flex gap-[15px] overflow-x-auto scrollbar-hide px-[25px] pt-[15px] pb-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="shrink-0 w-[173px] h-[248px] p-[15px] border border-line rounded-card"
          >
            <Skeleton className="h-[100px] rounded-xl" />
            <Skeleton className="h-4 w-4/5 mt-3" />
            <Skeleton className="h-3.5 w-1/2 mt-2" />
            <Skeleton className="h-[46px] w-[46px] rounded-[17px] ml-auto mt-6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={gridContainer}
      initial="initial"
      animate="animate"
      className="flex gap-[15px] overflow-x-auto scrollbar-hide snap-row px-[25px] pt-[15px] pb-1"
    >
      {products.map((product) => (
        <div key={product._id} className="shrink-0 w-[173px]">
          <ProductCard product={product} />
        </div>
      ))}
    </motion.div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { products, categories, loading } = useProducts();

  /**
   * The three rails, from one catalogue.
   *
   * Nothing is curated yet and the API has no "featured" flag, so the split is
   * derived: anything the shop gave a real list price to is genuinely an offer
   * and leads; the rest fills the other two rails without repeating.
   */
  const { offers, bestSelling, groceries } = useMemo(() => {
    const discounted = products.filter((product) =>
      product.variants?.some((variant) => variant.mrp != null && variant.mrp > variant.price)
    );
    const rest = products.filter((product) => !discounted.includes(product));
    const pool = [...discounted, ...rest];

    return {
      offers: pool.slice(0, 8),
      bestSelling: pool.slice(8, 16),
      groceries: pool.slice(16, 24),
    };
  }, [products]);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface pb-32 sm:pb-10">
      {/* ── Brand mark and location ──────────────────────────────────────── */}
      <header className="pt-12 text-center">
        <img
          src="/design/logo-carrot.svg"
          alt=""
          aria-hidden="true"
          width={26}
          height={31}
          className="mx-auto w-[26px] h-[31px]"
        />
        <p className="mt-3 inline-flex items-center gap-1.5 text-[18px] font-semibold text-ink-muted">
          <MapPin className="w-[18px] h-[18px]" />
          Delhi NCR
        </p>
      </header>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className={cx('mt-4', GUTTER)}>
        <button
          onClick={() => navigate('/products')}
          className="w-full h-[51.5px] flex items-center justify-center gap-3 rounded-[15px] bg-surface-sunken text-[14px] font-semibold text-ink-muted"
        >
          <Search className="w-[18px] h-[18px]" strokeWidth={2.4} />
          Search Store
        </button>
      </div>

      {/* ── Promo banner ─────────────────────────────────────────────────── */}
      <div className={cx('mt-5', GUTTER)}>
        <motion.button
          whileTap={tap}
          onClick={() => navigate('/products')}
          className="relative w-full h-[115px] rounded-[8px] border border-[#F2F3F2] dark:border-line overflow-hidden bg-gradient-to-r from-[#FDF3E7] via-white to-[#F0F8EE] text-left"
        >
          {/*
            The design's artwork, exported from the source file: the vegetable
            cluster anchoring the left, loose greens drifting in at the right.
          */}
          <img
            src="/design/banner-veg-cluster.png"
            alt=""
            aria-hidden="true"
            className="absolute left-1 bottom-0 h-[105px] w-auto object-contain pointer-events-none"
          />
          <img
            src="/design/banner-greens.png"
            alt=""
            aria-hidden="true"
            className="absolute -right-6 -top-2 h-[48px] w-auto object-contain pointer-events-none"
          />

          <div className="absolute inset-y-0 right-[6%] left-[40%] flex flex-col items-center justify-center text-center">
            <p className="text-[20px] font-bold text-[#030303] dark:text-ink leading-tight">
              Everyday grocery
            </p>
            <p className="mt-1 text-[14px] font-medium text-brand-600">
              Delivered to your door
            </p>
          </div>

          {/* The design's pagination dots. One page for now — the shop has a
              single promo, so the rest read as "more to come", not as controls. */}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            <span className="w-[17px] h-[5px] rounded-[15px] bg-brand-600" />
            <span className="w-[5px] h-[5px] rounded-[15px] bg-black/30" />
            <span className="w-[5px] h-[5px] rounded-[15px] bg-black/30" />
          </span>
        </motion.button>
      </div>

      {/* ── Exclusive Offer ──────────────────────────────────────────────── */}
      <section className="mt-7">
        <SectionHead title="Exclusive Offer" to="/products" />
        <ProductRail products={offers} loading={loading} />
      </section>

      {/* ── Best Selling ─────────────────────────────────────────────────── */}
      <section className="mt-7">
        <SectionHead title="Best Selling" to="/products" />
        <ProductRail products={bestSelling} loading={loading} />
      </section>

      {/* ── Groceries ────────────────────────────────────────────────────── */}
      <section className="mt-7">
        <SectionHead title="Groceries" to="/products" />

        <div className="flex gap-[15px] overflow-x-auto scrollbar-hide snap-row px-[25px] pt-[15px]">
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="shrink-0 w-[248px] h-[105px] rounded-card" />
              ))
            : categories.map((category, index) => (
                <motion.button
                  key={category._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.snappy, delay: index * 0.05 }}
                  whileTap={tap}
                  onClick={() => navigate(`/products?category=${category.slug}`)}
                  className="relative shrink-0 w-[248px] h-[105px] rounded-card flex items-center gap-4 pl-[17px] pr-5 overflow-hidden"
                >
                  {/*
                    The tint is a 15% wash of a solid hue, exactly as the design
                    builds it — a separate layer rather than an alpha colour, so
                    the label above it stays at full contrast.
                  */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 opacity-15"
                    style={{ backgroundColor: tintFor(index).hue }}
                  />

                  <span className="relative w-[72px] h-[72px] shrink-0 flex items-center justify-center">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt=""
                        loading="lazy"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-4xl">
                        {CATEGORY_EMOJI[category.slug] ?? '🛒'}
                      </span>
                    )}
                  </span>

                  <span className="relative text-[20px] font-semibold text-[#3E423F] dark:text-ink text-left leading-tight">
                    {category.name}
                  </span>
                </motion.button>
              ))}
        </div>

        <ProductRail products={groceries} loading={loading} />
      </section>

      {/* ── Contact — a real shop, and customers do phone it ──────────────── */}
      <section className={cx('mt-8', GUTTER)}>
        <div className="rounded-card bg-brand-50 dark:bg-brand-900/20 p-5">
          <h2 className="text-[18px] font-bold text-ink">Can't find what you need?</h2>
          <p className="mt-1 mb-4 text-[14px] text-ink-muted">
            Call the shop and we'll add it to your order.
          </p>
          <div className="flex flex-wrap gap-2">
            {['9266667069', '9654653719'].map((number) => (
              <motion.a
                key={number}
                whileTap={tap}
                href={`tel:${number}`}
                className="inline-flex items-center h-11 px-4 rounded-full bg-brand-600 text-white text-[14px] font-semibold"
              >
                {number}
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-[12px] text-ink-faint">
        © {new Date().getFullYear()} Timeless Baazar
      </p>
    </motion.div>
  );
};

export default Home;
