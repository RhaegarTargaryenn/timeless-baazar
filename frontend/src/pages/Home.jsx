import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

import { useProducts } from '../hooks/useProducts';
import ProductCard from '../components/ProductCard';
import { MapPin, ArrowRight, WifiOff } from '../components/icons';
import { Button, EmptyState, Skeleton, WakingNotice, cx } from '../components/ui';
import { gridContainer, instant, pageIn, spring, tap } from '../lib/motion';

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
 * Festival banners.
 *
 * Artwork the shop supplies, not something drawn here -- each one is a finished
 * composition carrying its own headline and call to action, so the card adds no
 * text of its own. `to` is where tapping it goes.
 *
 * Add a second entry to run two; the dots appear on their own once there is
 * something to page between, and stay hidden while there is only this.
 */
const BANNERS = [
  {
    id: 'janmashtami',
    alt: 'Happy Janmashtami from Timeless Bazar — celebrate the divine birth of Krishna with pure and fresh essentials',
    webp: '/design/banners/janmashtami-750.webp',
    webpLarge: '/design/banners/janmashtami-1200.webp',
    jpg: '/design/banners/janmashtami-1200.jpg',
    to: '/products',
  },
];

/**
 * The banner strip.
 *
 * A scroll-snapping track, one card per banner. This is the one place on the
 * page a sideways gesture belongs -- a banner is one thing at a time by
 * definition -- and being a single row it cannot swallow a downward flick the
 * way the design's three stacked rails did.
 *
 * The artwork is 1774x887 and the card holds that ratio exactly, so nothing is
 * cropped: the headline sits at the left of the image and any crop eats it.
 */
const FestiveBanner = ({ navigateTo }) => {
  const [active, setActive] = React.useState(0);

  // Which card is under the thumb, from how far the track has scrolled.
  const onScroll = (event) => {
    const { scrollLeft, clientWidth } = event.currentTarget;
    setActive(Math.round(scrollLeft / clientWidth));
  };

  return (
    <div className="mt-5">
      <div
        onScroll={onScroll}
        className={cx(
          'flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide',
          GUTTER
        )}
      >
        {BANNERS.map((banner) => (
          <motion.button
            key={banner.id}
            whileTap={tap}
            onClick={() => navigateTo(banner.to)}
            className="snap-center shrink-0 w-full rounded-[15px] overflow-hidden bg-surface-sunken"
          >
            <picture>
              <source
                type="image/webp"
                srcSet={`${banner.webp} 750w, ${banner.webpLarge} 1200w`}
                sizes="(min-width: 640px) 640px, 100vw"
              />
              <img
                src={banner.jpg}
                alt={banner.alt}
                width={1774}
                height={887}
                /* Eager, not lazy: this is the first thing on the page, and a
                   lazy hero flashes an empty box on arrival. */
                loading="eager"
                className="w-full h-auto aspect-[1774/887] object-cover"
              />
            </picture>
          </motion.button>
        ))}
      </div>

      {BANNERS.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {BANNERS.map((banner, index) => (
            <span
              key={banner.id}
              className={cx(
                'h-1.5 rounded-full transition-all duration-300',
                index === active ? 'w-4 bg-brand-600' : 'w-1.5 bg-line'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
      <Link
        to={to}
        className="shrink-0 inline-flex items-center gap-1 text-[16px] font-semibold text-brand-600"
      >
        View All
        <ArrowRight className="w-4 h-4" />
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
 * The category strip.
 *
 * One wide pill holding every department side by side, with a white card that
 * slides to whichever is selected. The slide comes from a shared `layoutId`
 * under `spring.layout` -- the same motion the Add button uses when it morphs
 * into a quantity stepper, so the two read as one language rather than two.
 *
 * This replaces a grid of six large squares. That grid pushed the products
 * themselves below the fold and a tap left the page; here the whole shop fits
 * on one line and a tap swaps the grid underneath, so comparing two
 * departments costs two taps rather than two page loads.
 *
 * "All" leads: arriving at a shop already filtered to daal would be wrong.
 */
const CategoryPills = ({ categories, loading, active, onSelect }) => {
  const reduced = useReducedMotion();

  // Framer still runs layout animations under reduced motion, which is the
  // thing someone with vestibular sensitivity is usually trying to avoid.
  const layoutTransition = reduced ? instant : spring.layout;

  if (loading) {
    return (
      <div className={cx('mt-5', GUTTER)}>
        <Skeleton className="h-[78px] rounded-[22px]" />
      </div>
    );
  }

  return (
    <div className={cx('mt-5', GUTTER)}>
      <div
        role="tablist"
        aria-label="Shop by category"
        className="flex gap-1 p-1.5 rounded-[22px] bg-surface-sunken overflow-x-auto scrollbar-hide"
      >
        {categories.map((chip) => {
          const selected = chip.slug === active;

          return (
            <motion.button
              key={chip._id}
              role="tab"
              aria-selected={selected}
              whileTap={tap}
              onClick={() => onSelect(chip.slug)}
              className="relative shrink-0 w-[82px] py-2.5 flex flex-col items-center gap-1.5"
            >
              {/*
                One element shared across every chip, not one per chip: Framer
                moves this single node to whichever chip owns it instead of
                cross-fading two copies, and that is what makes it slide.
              */}
              {selected && (
                <motion.span
                  layoutId="category-pill"
                  transition={layoutTransition}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[17px] bg-surface-raised shadow-sm"
                />
              )}

              <span className="relative w-10 h-10 flex items-center justify-center">
                {chip.image ? (
                  <img
                    src={chip.image}
                    alt=""
                    loading="lazy"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-[32px] leading-none">
                    {CATEGORY_EMOJI[chip.slug] ?? '🛒'}
                  </span>
                )}
              </span>

              <span
                className={cx(
                  'relative text-[11px] font-semibold text-center leading-tight line-clamp-1 transition-colors',
                  selected ? 'text-brand-600' : 'text-ink-muted'
                )}
              >
                {chip.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * The promo band.
 *
 * One photograph of a bag packed with what this shop actually sells -- rice,
 * dal, sooji, gur -- against a wash of brand green, with the invitation at the
 * left. It replaces a card that showed three thumbnails lifted off the category
 * tiles above it: the same pictures twice on one screen, which read as filler.
 *
 * The photograph is a genuine cut-out (two thirds of its pixels are fully
 * transparent), so it sits on the tint with no white box around it -- which is
 * the whole reason it can bleed off the card's edge instead of living in a
 * frame of its own.
 *
 * It stays below the products rather than above them. A banner at the top is
 * the first thing a returning customer scrolls past; here it reads as an
 * invitation to carry on once the row above has run out.
 */
const PromoBanner = ({ navigateTo }) => (
  <div className={GUTTER}>
    <motion.button
      whileTap={tap}
      onClick={() => navigateTo('/products')}
      className="relative w-full overflow-hidden rounded-card bg-brand-50 dark:bg-brand-900/20 text-left"
    >
      {/*
        The bag bleeds off the bottom-right corner. It is sized in percentages
        so the composition holds from a 320px phone to the 5xl column cap,
        rather than snapping at a breakpoint.
      */}
      <picture>
        <source
          type="image/webp"
          srcSet="/design/bag-420.webp 420w, /design/bag-700.webp 700w"
          sizes="(min-width: 640px) 320px, 50vw"
        />
        <img
          src="/design/bag-700.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={700}
          height={467}
          className="absolute right-[-4%] bottom-[-6%] w-[52%] max-w-[320px] object-contain"
        />
      </picture>

      <div className="relative w-[55%] py-7 pl-6 pr-2">
        <p className="text-[20px] font-bold leading-tight text-ink">Everyday grocery</p>
        <p className="mt-1 text-[14px] font-medium text-brand-600">
          Delivered to your door
        </p>

        {/*
          A span, not a nested button -- the whole card is already the control,
          and a button inside a button is invalid and swallows the outer tap.
        */}
        <span className="mt-5 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-brand-600 text-white text-[14px] font-semibold">
          Shop all
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </motion.button>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const { products, categories, loading, error, waking, reload } = useProducts();

  /**
   * Which chip in the strip is lit.
   *
   * Null until someone chooses, and the first department stands in -- the
   * categories arrive from the API, so there is nothing to name at first
   * render. Storing the fallback in state instead would mean writing state
   * from inside an effect and rendering one empty frame before it lands.
   */
  const [chosenCategory, setChosenCategory] = useState(null);
  const activeCategory = chosenCategory ?? categories[0]?.slug ?? null;

  /**
   * The one product section: whatever is under the lit chip.
   *
   * Capped at four, which fills two rows of two on a phone without pushing the
   * next heading off-screen. The order is left as the catalogue gives it --
   * there is nothing to rank by, and inventing one would be a lie about what
   * sells.
   */
  const shown = useMemo(() => {
    if (!activeCategory) return [];

    return products
      .filter((product) => product.category?.slug === activeCategory)
      .slice(0, PER_SECTION);
  }, [products, activeCategory]);

  // "See all" has to follow the chip, or it throws away the choice just made.
  const selected = categories.find((category) => category.slug === activeCategory);
  const sectionTitle = selected?.name ?? 'Shop';
  const seeAllTo = selected ? `/products?category=${selected.slug}` : '/products';

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface pb-32 sm:pb-10">
      {/* ── Brand mark and location ──────────────────────────────────────── */}
      <header className="pt-[max(2rem,calc(env(safe-area-inset-top)+0.5rem))] text-center">
        {/*
          The full lockup, not the bare carrot -- the mark alone said nothing to
          someone arriving from a shared link, and the banner artwork below
          already carries the name this way.
        */}
        <div className="flex items-center justify-center gap-2.5">
          <img
            src="/design/logo-carrot.svg"
            alt=""
            aria-hidden="true"
            width={26}
            height={31}
            className="w-[26px] h-[31px]"
          />
          <span className="text-[24px] font-extrabold tracking-tight text-brand-700">
            Timeless Bazar
          </span>
        </div>
        <p className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-ink-faint">
          Pure. Fresh. Timeless.
        </p>

        <p className="mt-3 inline-flex items-center gap-1.5 text-[18px] font-semibold text-ink-muted">
          <MapPin className="w-[18px] h-[18px]" />
          Delhi NCR
        </p>
      </header>

      {/* ── Festival banner ──────────────────────────────────────────────── */}
      <FestiveBanner navigateTo={navigate} />

      {/* ── Categories, and the products under whichever is chosen ───────── */}
      <CategoryPills
        categories={categories}
        loading={loading}
        active={activeCategory}
        onSelect={setChosenCategory}
      />

      <section className="mt-6">
        <SectionHead title={sectionTitle} to={seeAllTo} />
        {/*
          Three states, not one. Home used to hold skeletons no matter what
          happened, so a sleeping API and a dead one looked identical -- and
          both looked like a shop that had stopped working.
        */}
        {waking && loading ? (
          <div className={GUTTER}>
            <WakingNotice />
          </div>
        ) : error ? (
          <EmptyState
            icon={<WifiOff className="w-7 h-7" />}
            title="Could not load the shop"
            message={error}
            action={<Button onClick={reload}>Try again</Button>}
          />
        ) : (
          <ProductGrid products={shown} loading={loading} />
        )}
      </section>

      {/* ── Promo ────────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <PromoBanner navigateTo={navigate} />
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
