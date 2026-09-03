import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Eye, EyeOff, Pencil, Check, X, Loader2, PackageX } from '../../components/icons';
import toast from 'react-hot-toast';

import { api, formatRupees, paiseToRupees, rupeesToPaise } from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { spring, gridContainer, gridItem } from '../../lib/motion';
import {
  Skeleton,
  Button,
  EmptyState,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  cx,
} from '../../components/ui';

/**
 * Edit one variant's price without leaving the list.
 *
 * This is the screen's whole reason for existing. The client's actual routine
 * is "arhar dal is 140 now" — that should be three taps, not open a form, find
 * the field, scroll, save. Everything else here is secondary to making this
 * fast.
 */
const PriceCell = ({ product, variant, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(paiseToRupees(variant.price)));
  const [saving, setSaving] = useState(false);

  const cancel = () => {
    setValue(String(paiseToRupees(variant.price)));
    setEditing(false);
  };

  const save = async () => {
    const paise = rupeesToPaise(value);

    if (paise <= 0) {
      toast.error('Enter a price above zero');
      return;
    }
    if (paise === variant.price) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      // PATCH replaces the variants array, so every variant is sent back with
      // only this one's price changed. Sending just the edited variant would
      // drop the others.
      const { product: updated } = await api.patch(`/products/${product._id}`, {
        variants: product.variants.map((v) => ({
          _id: v._id,
          label: v.label,
          price: v._id === variant._id ? paise : v.price,
          mrp: v.mrp,
          isActive: v.isActive,
        })),
      });

      toast.success(`${product.name} — ${variant.label} is now ${formatRupees(paise)}`);
      onSaved(updated);
      setEditing(false);
    } catch (error) {
      toast.error(error.message);
      setValue(String(paiseToRupees(variant.price)));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-baseline gap-1.5 px-2.5 py-1.5 -mx-1 rounded-lg hover:bg-surface-sunken transition-colors"
      >
        <span className="text-[11px] text-ink-muted">{variant.label}</span>
        <span className="text-sm font-bold text-ink tabular-nums">
          {formatRupees(variant.price)}
        </span>
        <Pencil className="w-3 h-3 text-ink-faint group-hover:text-brand-600 transition-colors" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-ink-muted w-10">{variant.label}</span>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-ink-faint">₹</span>
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          disabled={saving}
          className="w-24 pl-6 pr-2 py-1.5 text-sm font-bold tabular-nums border-2 border-brand-600 rounded-lg bg-surface-raised text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="p-1.5 rounded-lg bg-brand-600 text-white disabled:opacity-50"
        aria-label="Save price"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button
        onClick={cancel}
        disabled={saving}
        className="p-1.5 rounded-lg bg-surface-sunken text-ink-muted"
        aria-label="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * The show/hide toggle, shared by the phone card and the desktop table.
 *
 * It goes through the dedicated `/visibility` route rather than a general
 * PATCH, so flipping a switch can never carry a stale form's fields along with
 * it and overwrite a price.
 */
const useProductVisibility = (product, onChanged) => {
  const [toggling, setToggling] = useState(false);

  const toggleVisibility = async () => {
    setToggling(true);
    try {
      const next = !product.isActive;
      await api.patch(`/products/${product._id}/visibility`, { isActive: next });
      toast.success(next ? `${product.name} is now on the shop` : `${product.name} hidden`);
      onChanged({ ...product, isActive: next });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToggling(false);
    }
  };

  return { toggleVisibility, toggling };
};

const ProductRow = ({ product, onChanged }) => {
  const { toggleVisibility, toggling } = useProductVisibility(product, onChanged);

  return (
    <motion.div
      variants={gridItem}
      layout
      transition={spring.layout}
      className={cx(
        'bg-surface-raised rounded-2xl border p-3 transition-colors',
        product.isActive ? 'border-line' : 'border-dashed border-line bg-surface-sunken/60'
      )}
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl bg-surface-sunken overflow-hidden shrink-0">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt=""
              loading="lazy"
              className={`w-full h-full object-cover ${product.isActive ? '' : 'opacity-40 grayscale'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-faint">
              <PackageX className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink truncate">
                {product.name}
              </h3>
              <p className="text-[11px] text-ink-muted truncate">
                {product.nameHindi || product.category?.name}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleVisibility}
                disabled={toggling}
                title={product.isActive ? 'Hide from shop' : 'Show on shop'}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  product.isActive
                    ? 'text-brand-600 hover:bg-surface-sunken'
                    : 'text-ink-faint hover:bg-surface-sunken'
                }`}
              >
                {toggling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : product.isActive ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
              <Link
                to={`/admin/products/${product._id}`}
                title="Edit"
                className="p-2 rounded-lg text-ink-muted hover:bg-surface-sunken transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {product.variants.map((variant) => (
              <PriceCell
                key={variant._id}
                product={product}
                variant={variant}
                onSaved={onChanged}
              />
            ))}
          </div>

          {!product.isActive && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
              Hidden — customers cannot see this
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * The catalogue as a table, for a desktop.
 *
 * The phone cards stay: this is the alternative shown from `lg` up, where two
 * fixed-height cards side by side leave most of a 1280px screen empty and the
 * client scrolls 71 products a handful at a time. A row per product puts far
 * more of the catalogue in one screenful, which is what "arhar dal is 140 now"
 * actually needs.
 *
 * `PriceCell` is reused rather than reimplemented -- editing a price in place
 * is this screen's entire reason for existing, and a second copy of that
 * behaviour would be a second thing to keep correct.
 */
const ProductTable = ({ products, onChanged }) => (
  <Table>
    <THead>
      <TR>
        <TH className="w-14" />
        <TH>Product</TH>
        <TH>Category</TH>
        <TH>Prices</TH>
        <TH align="center">On shop</TH>
        <TH align="right">Edit</TH>
      </TR>
    </THead>
    <TBody>
      {products.map((product) => (
        <ProductTableRow key={product._id} product={product} onChanged={onChanged} />
      ))}
    </TBody>
  </Table>
);

const ProductTableRow = ({ product, onChanged }) => {
  const { toggleVisibility, toggling } = useProductVisibility(product, onChanged);

  return (
    <TR className={cx(!product.isActive && 'bg-surface-sunken/50')}>
      <TD>
        <div className="w-10 h-10 rounded-lg bg-surface-sunken overflow-hidden">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt=""
              loading="lazy"
              className={cx(
                'w-full h-full object-cover',
                !product.isActive && 'opacity-40 grayscale'
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-faint">
              <PackageX className="w-4 h-4" />
            </div>
          )}
        </div>
      </TD>

      <TD className="min-w-[200px]">
        <p className="font-semibold text-ink truncate">{product.name}</p>
        {product.nameHindi && (
          <p className="text-[12px] text-ink-muted truncate">{product.nameHindi}</p>
        )}
      </TD>

      <TD className="text-ink-muted whitespace-nowrap">{product.category?.name ?? '—'}</TD>

      {/* Every size on one line, each editable where it stands. */}
      <TD>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {product.variants.map((variant) => (
            <PriceCell
              key={variant._id}
              product={product}
              variant={variant}
              onSaved={onChanged}
            />
          ))}
        </div>
      </TD>

      <TD align="center">
        <button
          onClick={toggleVisibility}
          disabled={toggling}
          title={product.isActive ? 'Hide from shop' : 'Show on shop'}
          className={cx(
            'p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-surface-sunken',
            product.isActive ? 'text-brand-600' : 'text-ink-faint'
          )}
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : product.isActive ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
      </TD>

      <TD align="right">
        <Link
          to={`/admin/products/${product._id}`}
          title="Edit"
          className="inline-flex p-2 rounded-lg text-ink-muted hover:bg-surface-sunken transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </Link>
      </TD>
    </TR>
  );
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibility, setVisibility] = useState('all'); // all | live | hidden

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productData, categoryData] = await Promise.all([
        api.get('/products?all=true&limit=100'),
        api.get('/categories?all=true'),
      ]);
      setProducts(productData.products);
      setCategories(categoryData.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Replace one product in place after an edit.
   *
   * Cheaper than refetching, and it keeps the list from jumping under the
   * client's finger right after they tapped something.
   */
  const handleChanged = useCallback((updated) => {
    setProducts((current) =>
      current.map((product) => (product._id === updated._id ? { ...product, ...updated } : product))
    );
  }, []);

  const matchesSearch = useCallback(
    (product) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        (product.nameHindi ?? '').includes(search.trim())
      );
    },
    [search]
  );

  const matchesVisibility = useCallback(
    (product) => {
      if (visibility === 'live') return product.isActive;
      if (visibility === 'hidden') return !product.isActive;
      return true;
    },
    [visibility]
  );

  const filtered = useMemo(
    () =>
      products.filter(
        (product) =>
          matchesVisibility(product) &&
          matchesSearch(product) &&
          (categoryFilter === 'all' || product.category?.slug === categoryFilter)
      ),
    [products, matchesVisibility, matchesSearch, categoryFilter]
  );

  const visibilityCounts = useMemo(
    () => ({
      all: products.length,
      live: products.filter((product) => product.isActive).length,
      hidden: products.filter((product) => !product.isActive).length,
    }),
    [products]
  );

  /**
   * How many products each category pill would show **given the filter above
   * it**, not in the catalogue overall.
   *
   * This is what makes the two rows one control rather than two unrelated ones:
   * switch the top row to "Hidden" and the category numbers become how many
   * hidden products each category holds. A count that ignored the row above it
   * would send the client tapping into empty categories.
   */
  const categoryCounts = useMemo(() => {
    const counts = { all: 0 };
    for (const product of products) {
      if (!matchesVisibility(product) || !matchesSearch(product)) continue;
      counts.all += 1;
      const slug = product.category?.slug;
      if (slug) counts[slug] = (counts[slug] ?? 0) + 1;
    }
    return counts;
  }, [products, matchesVisibility, matchesSearch]);

  // A category with nothing in it under the current filter is noise, so it goes
  // -- unless it is the one selected, which must stay visible to be undone.
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) => (categoryCounts[category.slug] ?? 0) > 0 || categoryFilter === category.slug
      ),
    [categories, categoryCounts, categoryFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Products</h1>
          <p className="text-xs text-ink-muted mt-0.5">
            {products.length} total
            {visibilityCounts.hidden > 0 && ` · ${visibilityCounts.hidden} hidden`}
          </p>
        </div>
        <Link
          to="/admin/products/new"
          onClick={() => haptic('tap')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl shadow-brand active:shadow-press shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </Link>
      </div>

      <div className="bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 rounded-xl px-3.5 py-2.5">
        <p className="text-xs text-brand-800 dark:text-brand-300">
          Tap any price to change it. Changes appear on the shop straight away.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-surface-raised border border-line rounded-xl text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-600"
        />
      </div>

      {/*
        Two levels, and the order matters.

        The old screen ran visibility and category as one long scrolling row
        with a divider between them, so two unrelated questions looked like one
        list and the category pills were usually off-screen. Now the primary
        cut -- is this on the shop or not -- is a fixed segmented control that
        is always fully visible, and the categories sit under it as a scrolling
        row whose counts follow whatever it is set to.
      */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-surface-sunken rounded-xl">
        {[
          { id: 'all', label: 'All' },
          { id: 'live', label: 'On shop' },
          { id: 'hidden', label: 'Hidden' },
        ].map(({ id, label }) => {
          const active = visibility === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (!active) haptic('tap');
                setVisibility(id);
              }}
              className={cx(
                'relative h-9 rounded-lg text-xs font-bold transition-colors',
                active ? 'text-white' : 'text-ink-muted'
              )}
            >
              {active && (
                <motion.span
                  layoutId="admin-visibility-pill"
                  transition={spring.layout}
                  className="absolute inset-0 rounded-lg bg-forest"
                />
              )}
              <span className="relative">
                {label}
                {visibilityCounts[id] > 0 && (
                  <span className={cx('ml-1 tabular', active ? 'text-white/60' : 'text-ink-faint')}>
                    {visibilityCounts[id]}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {[{ slug: 'all', name: 'Every category' }, ...visibleCategories].map((category) => {
          const active = categoryFilter === category.slug;
          const count = categoryCounts[category.slug] ?? 0;
          return (
            <button
              key={category.slug}
              onClick={() => {
                if (!active) haptic('tap');
                setCategoryFilter(category.slug);
              }}
              className={cx(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                active
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-raised text-ink-muted border border-line'
              )}
            >
              {category.name}
              {count > 0 && (
                <span className={cx('ml-1.5 tabular', active ? 'text-white/70' : 'text-ink-faint')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
          role="status"
          aria-label="Loading products"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-[104px] rounded-2xl"
              style={{ opacity: 1 - index * 0.12 }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-ink-muted mb-4">{error}</p>
          <Button size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PackageX className="w-7 h-7" />}
          title="Nothing matches"
          message={
            search.trim()
              ? `No product is called "${search.trim()}".`
              : 'Try a different filter.'
          }
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setVisibility('all');
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-xs text-ink-faint">
            Showing {filtered.length} of {products.length}
          </p>

          {/*
            Two columns from `md` up. These cards are a fixed height and only
            about 400px of content wide, so a single column on a tablet or the
            client's laptop left most of the screen empty and made them scroll
            through 71 products one at a time.
          */}
          <motion.div
            variants={gridContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-2.5 lg:hidden"
          >
            {filtered.map((product) => (
              <ProductRow key={product._id} product={product} onChanged={handleChanged} />
            ))}
          </motion.div>

          <div className="hidden lg:block">
            <ProductTable products={filtered} onChanged={handleChanged} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminProducts;
