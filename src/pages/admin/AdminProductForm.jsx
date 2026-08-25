import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { api, paiseToRupees, rupeesToPaise } from '../../lib/api';

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const emptyVariant = () => ({ label: '', price: '', mrp: '', isActive: true });

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
      {label}
    </label>
    {children}
    {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
  </div>
);

const inputClass =
  'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500';

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    nameHindi: '',
    slug: '',
    description: '',
    category: '',
    images: [''],
    variants: [emptyVariant()],
    isActive: true,
    tags: [],
  });

  // The slug is derived from the name while creating, but frozen once saved:
  // it is in URLs, and changing it silently breaks any link already shared.
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { categories: list } = await api.get('/categories?all=true');
        setCategories(list);

        if (isNew) {
          setForm((f) => ({ ...f, category: list[0]?._id ?? '' }));
          return;
        }

        const { product } = await api.get(`/products/${id}`);
        setForm({
          name: product.name,
          nameHindi: product.nameHindi ?? '',
          slug: product.slug,
          description: product.description ?? '',
          category: product.category?._id ?? product.category,
          images: product.images?.length ? product.images : [''],
          variants: product.variants.map((v) => ({
            _id: v._id,
            label: v.label,
            price: String(paiseToRupees(v.price)),
            mrp: v.mrp ? String(paiseToRupees(v.mrp)) : '',
            isActive: v.isActive,
          })),
          isActive: product.isActive,
          tags: product.tags ?? [],
        });
        setSlugTouched(true);
      } catch (error) {
        toast.error(error.message);
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isNew, navigate]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setVariant = (index, key, value) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.category) errors.category = 'Pick a category';

    const usable = form.variants.filter((v) => v.label.trim() && Number(v.price) > 0);
    if (usable.length === 0) errors.variants = 'Add at least one size with a price';

    const badMrp = form.variants.find(
      (v) => v.mrp && Number(v.mrp) > 0 && rupeesToPaise(v.mrp) <= rupeesToPaise(v.price)
    );
    if (badMrp) {
      errors.variants = `"${badMrp.label || 'A size'}": the crossed-out price must be higher than the selling price`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      nameHindi: form.nameHindi.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      description: form.description.trim(),
      category: form.category,
      images: form.images.map((i) => i.trim()).filter(Boolean),
      isActive: form.isActive,
      tags: form.tags,
      variants: form.variants
        .filter((v) => v.label.trim() && Number(v.price) > 0)
        .map((v) => ({
          ...(v._id ? { _id: v._id } : {}),
          label: v.label.trim(),
          price: rupeesToPaise(v.price),
          mrp: v.mrp && Number(v.mrp) > 0 ? rupeesToPaise(v.mrp) : null,
          isActive: v.isActive,
        })),
    };

    setSaving(true);
    try {
      if (isNew) {
        await api.post('/products', payload);
        toast.success(`${payload.name} added`);
      } else {
        await api.patch(`/products/${id}`, payload);
        toast.success('Saved');
      }
      navigate('/admin/products');
    } catch (error) {
      // The API returns per-field details on a 400 — surface them next to the
      // inputs rather than as one opaque toast.
      if (error.details?.length) {
        toast.error(error.details.map((d) => d.message).join('. '));
      } else {
        toast.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // A shop owner deleting a product by mistake with no undo is the worst
    // first impression this panel can make, so it takes a deliberate confirm.
    const typed = window.prompt(
      `Delete "${form.name}" permanently?\n\nThis cannot be undone. To hide it from customers instead, use the eye icon on the list.\n\nType DELETE to confirm:`
    );
    if (typed !== 'DELETE') return;

    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      toast.success(`${form.name} deleted`);
      navigate('/admin/products');
    } catch (error) {
      toast.error(error.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <Link
          to="/admin/products"
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isNew ? 'Add product' : form.name}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <Field label="Product name" error={fieldErrors.name}>
          <input
            value={form.name}
            onChange={(e) => {
              setField('name', e.target.value);
              if (!slugTouched) setField('slug', slugify(e.target.value));
            }}
            placeholder="Arhar Dal"
            className={inputClass}
          />
        </Field>

        <Field label="Hindi name" hint="Shown under the name, and searchable">
          <input
            value={form.nameHindi}
            onChange={(e) => setField('nameHindi', e.target.value)}
            placeholder="अरहर दाल"
            className={inputClass}
          />
        </Field>

        <Field label="Category" error={fieldErrors.category}>
          <select
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            className={inputClass}
          >
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" hint="Optional">
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={2}
            placeholder="Premium quality toor dal"
            className={inputClass}
          />
        </Field>

        <Field
          label="Photo"
          hint="Paste an image path or link. Uploads are coming in a later step."
        >
          <input
            value={form.images[0] ?? ''}
            onChange={(e) => setField('images', [e.target.value])}
            placeholder="/Products/Toor_dal.jpg"
            className={inputClass}
          />
          {form.images[0] && (
            <img
              src={form.images[0]}
              alt=""
              className="mt-2 w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </Field>
      </div>

      {/* Sizes and prices */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sizes & prices</h2>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }))}
            className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400"
          >
            <Plus className="w-3.5 h-3.5" /> Add size
          </button>
        </div>

        {fieldErrors.variants && (
          <p className="text-[11px] text-red-500 mb-2">{fieldErrors.variants}</p>
        )}

        <div className="space-y-3">
          {form.variants.map((variant, index) => (
            <div
              key={variant._id ?? index}
              className="grid grid-cols-[1fr_auto] gap-2 items-start p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl"
            >
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={variant.label}
                  onChange={(e) => setVariant(index, 'label', e.target.value)}
                  placeholder="1 kg"
                  className="px-2.5 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(e) => setVariant(index, 'price', e.target.value)}
                    placeholder="132"
                    className="w-full pl-5 pr-2 py-2 text-sm tabular-nums bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={variant.mrp}
                    onChange={(e) => setVariant(index, 'mrp', e.target.value)}
                    placeholder="MRP"
                    title="Optional. Leave empty for no discount badge."
                    className="w-full pl-5 pr-2 py-2 text-sm tabular-nums bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVariant(index, 'isActive', !variant.isActive)}
                  title={variant.isActive ? 'In stock' : 'Out of stock'}
                  className={`px-2.5 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    variant.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {variant.isActive ? 'In stock' : 'Out'}
                </button>
                {form.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        variants: f.variants.filter((_, i) => i !== index),
                      }))
                    }
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="Remove size"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-400 mt-3">
          The third box is the crossed-out price. Leave it empty and no discount badge shows.
        </p>
      </div>

      {/* Visibility */}
      <label className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setField('isActive', e.target.checked)}
          className="w-5 h-5 rounded accent-green-600"
        />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Show on the shop</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Uncheck to hide this product from customers without deleting it
          </p>
        </div>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isNew ? 'Add product' : 'Save changes'}
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl disabled:opacity-60"
            aria-label="Delete product"
          >
            {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
        )}
      </div>
    </form>
  );
};

export default AdminProductForm;
