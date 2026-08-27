import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { Skeleton, cx } from '../components/ui';
import { gridContainer, pageIn, spring, tap } from '../lib/motion';
import { tintFor } from '../lib/categoryTints';

/**
 * Home.
 *
 * Built from the Figma source (node 1:45, "Home Screen"), with two deliberate
 * departures.
 *
 * First, the design's horizontal rails are laid out as vertical grids. The
 * reference put three side-scrolling rows on one phone screen -- two product
 * rails of eight and a category rail of six. That reads well as a static
 * mockup and badly under a thumb: the page scrolls down while three separate
 * zones inside it grab the gesture sideways, so an ordinary downward flick
 * lands in a rail and shoves it. Nielsen Norman's carousel testing puts the
 * practical ceiling at three or four items before people stop swiping, and
 * says outright that with many items a grid beats a carousel because every
 * item is reachable directly rather than in sequence. Baymard reaches the same
 * place from the other side: static sections outperform carousels, and 70% of
 * mobile users size a homepage up by scrolling straight down it.
 *
 * Second, the page is shorter. The design opened with an illustrated banner
 * and carried three product sections; this carries one, and the promo moved
 * below it built from the shop's own photographs. A grocery customer arrives
 * either knowing what they want -- in which case search and the category grid
 * are what matter -- or wanting a browse, which one section of four plus "See
 * all" serves without a three-screen scroll.
 *
 * The design's measurements are otherwise kept: a 25px page gutter, a 51.5px
 * search field at radius 15, and 24px section titles against a 16px green
 * "See all".
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

/**
 * Four products, not the design's eight.
 *
 * Four fills exactly two rows of two on a phone, which is the most that fits
 * without the next section's heading being pushed off-screen -- the heading is
 * what tells someone there is more page below. "See all" carries the rest.
 */
const PER_SECTION = 4;

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
 * Products, two across on a phone and wider up the breakpoints.
 *
 * Two columns rather than one: a grocery card is recognised by its photo and
 * its price, neither of which needs full width, and one-per-row would put the
 * contact block four screens down.
 */
const GRID = 'grid grid-cols-2 gap-[15px] sm:grid-cols-3 lg:grid-cols-4 sm:gap-5';

const ProductGrid = ({ products, loading }) => {
  if (loading) {
    return (
      <div className={cx(GRID, GUTTER, 'pt-[15px]')}>
        {Array.from({ length: PER_SECTION }).map((_, index) => (
          <div key={index} className="h-[248px] p-[15px] border border-line rounded-card">
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
      className={cx(GRID, GUTTER, 'pt-[15px]')}
    >
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </motion.div>
  );
};

/**
 * The category tiles.
 *
 * Three across, square, photo over label. The design laid these out as 248px
 * cards in a side-scrolling row, which hid four of the six shop departments
 * off the right edge -- the worst thing to hide, since this is how someone who
 * knows what they came for gets there. Three-up puts all six on screen in two
 * rows, inside the height one 248px card used to occupy.
 */
const CategoryGrid = ({ categories, loading, navigateTo }) => (
  <div
    className={cx(
      'grid grid-cols-3 gap-[13px] sm:grid-cols-4 lg:grid-cols-6',
      GUTTER,
      'pt-[15px]'
    )}
  >
    {loading
      ? Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-card" />
        ))
      : categories.map((category, index) => (
          <motion.button
            key={category._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.snappy, delay: index * 0.04 }}
            whileTap={tap}
            onClick={() => navigateTo(`/products?category=${category.slug}`)}
            className="relative aspect-square rounded-card overflow-hidden flex flex-col items-center justify-center gap-1.5 p-2"
          >
            {/*
              The tint is a 15% wash of a solid hue, exactly as the design
              builds it — a separate layer rather than an alpha colour, so the
              label above it stays at full contrast.
            */}
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-15"
              style={{ backgroundColor: tintFor(index).hue }}
            />

            <span className="relative w-[46px] h-[46px] shrink-0 flex items-center justify-center">
              {category.image ? (
                <img
                  src={category.image}
                  alt=""
                  loading="lazy"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-3xl">{CATEGORY_EMOJI[category.slug] ?? '🛒'}</span>
              )}
            </span>

            <span className="relative text-[12px] font-semibold text-[#3E423F] dark:text-ink text-center leading-tight line-clamp-2">
              {category.name}
            </span>
          </motion.button>
        ))}
  </div>
);

/**
 * The promo, built from the shop's own photographs.
 *
 * This replaces the illustrated banner the Figma file supplied. That drawing
 * was generic produce -- vegetables this shop does not sell, since it is a
 * dry-goods grocer of dal, rice, flour and spice. These are the photographs
 * already on the category tiles, so the promo shows what is actually on the
 * shelves, and it costs no new asset.
 *
 * It also sits below the products rather than above them. A banner at the top
 * is the first thing a returning customer scrolls past; here it reads as an
 * invitation to carry on once the four products have run out.
 */
const PromoBanner = ({ categories, loading, navigateTo }) => (
  <div className={GUTTER}>
    <motion.button
      whileTap={tap}
      onClick={() => navigateTo('/products')}
      className="w-full rounded-card bg-brand-50 dark:bg-brand-900/20 p-5 text-left"
    >
      <div className="flex gap-2.5">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="flex-1 aspect-square rounded-xl" />
            ))
          : categories.slice(0, 3).map((category, index) => (
              <span
                key={category._id}
                className="relative flex-1 aspect-square rounded-xl overflow-hidden flex items-center justify-center p-2.5 bg-surface-raised"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 opacity-15"
                  style={{ backgroundColor: tintFor(index).hue }}
                />
                {category.image ? (
                  <img
                    src={category.image}
                    alt=""
                    loading="lazy"
                    className="relative max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="relative text-3xl">
                    {CATEGORY_EMOJI[category.slug] ?? '🛒'}
                  </span>
                )}
              </span>
            ))}
      </div>

      <p className="mt-4 text-[20px] font-bold text-ink leading-tight">Everyday grocery</p>
      <p className="mt-1 text-[14px] font-medium text-brand-600">Delivered to your door</p>

      {/*
        A span, not a nested button — the whole card is already the control,
        and a button inside a button is invalid and swallows the outer tap.
      */}
      <span className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-brand-600 text-white text-[14px] font-semibold">
        Shop all
        <ArrowRight className="w-4 h-4" />
      </span>
    </motion.button>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const { products, categories, loading } = useProducts();

  /**
   * The one product section, from the whole catalogue.
   *
   * Nothing is curated yet and the API has no "featured" flag, so the pick is
   * derived: anything the shop gave a real list price to is genuinely marked
   * down and leads, and the rest follows.
   */
  const bestSelling = useMemo(() => {
    const discounted = products.filter((product) =>
      product.variants?.some((variant) => variant.mrp != null && variant.mrp > variant.price)
    );
    const rest = products.filter((product) => !discounted.includes(product));

    return [...discounted, ...rest].slice(0, PER_SECTION);
  }, [products]);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface pb-32 sm:pb-10">
      {/* ── Brand mark and location ──────────────────────────────────────── */}
      <header className="pt-8 text-center">
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

      {/* ── Shop by category ─────────────────────────────────────────────── */}
      <section className="mt-7">
        <SectionHead title="Shop by Category" to="/products" />
        <CategoryGrid categories={categories} loading={loading} navigateTo={navigate} />
      </section>

      {/* ── Best Selling ─────────────────────────────────────────────────── */}
      <section className="mt-7">
        <SectionHead title="Best Selling" to="/products" />
        <ProductGrid products={bestSelling} loading={loading} />
      </section>

      {/* ── Promo ────────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <PromoBanner categories={categories} loading={loading} navigateTo={navigate} />
      </section>

      {/* ── Contact — a real shop, and customers do phone it ──────────────── */}
      <section className={cx('mt-6', GUTTER)}>
        <div className="rounded-card bg-surface-sunken p-5">
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
