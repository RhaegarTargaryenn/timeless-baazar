import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, EyeOff, Pencil, Check, X, Loader2, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';

import { api, formatRupees, paiseToRupees, rupeesToPaise } from '../../lib/api';

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
        className="group flex items-baseline gap-1.5 px-2.5 py-1.5 -mx-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
      >
        <span className="text-[11px] text-gray-500 dark:text-gray-400">{variant.label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
          {formatRupees(variant.price)}
        </span>
        <Pencil className="w-3 h-3 text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-gray-500 dark:text-gray-400 w-10">{variant.label}</span>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
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
          className="w-24 pl-6 pr-2 py-1.5 text-sm font-bold tabular-nums border-2 border-green-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="p-1.5 rounded-lg bg-green-600 text-white disabled:opacity-50"
        aria-label="Save price"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button
        onClick={cancel}
        disabled={saving}
        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
        aria-label="Cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ProductRow = ({ product, onChanged }) => {
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

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border p-3 transition-colors ${
        product.isActive
          ? 'border-gray-200 dark:border-gray-700'
          : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-800/40'
      }`}
    >
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt=""
              loading="lazy"
              className={`w-full h-full object-cover ${product.isActive ? '' : 'opacity-40 grayscale'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <PackageX className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {product.name}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
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
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
    </div>
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (categoryFilter !== 'all' && product.category?.slug !== categoryFilter) return false;
      if (visibility === 'live' && !product.isActive) return false;
      if (visibility === 'hidden' && product.isActive) return false;
      if (!query) return true;

      return (
        product.name.toLowerCase().includes(query) ||
        (product.nameHindi ?? '').includes(search.trim())
      );
    });
  }, [products, search, categoryFilter, visibility]);

  const hiddenCount = products.filter((p) => !p.isActive).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading your products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={load}
          className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {products.length} total
            {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-xl shadow-smooth shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </Link>
      </div>

      <div className="bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800/40 rounded-xl px-3.5 py-2.5">
        <p className="text-xs text-green-800 dark:text-green-300">
          Tap any price to change it. Changes appear on the shop straight away.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {[
          { id: 'all', label: 'All' },
          { id: 'live', label: 'On shop' },
          { id: 'hidden', label: `Hidden${hiddenCount ? ` (${hiddenCount})` : ''}` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setVisibility(id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              visibility === id
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

        {[{ slug: 'all', name: 'Every category' }, ...categories].map((category) => (
          <button
            key={category.slug}
            onClick={() => setCategoryFilter(category.slug)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === category.slug
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No products match that.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((product) => (
            <ProductRow key={product._id} product={product} onChanged={handleChanged} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
