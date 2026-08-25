import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Ticket, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { api, formatRupees, rupeesToPaise } from '../../lib/api';

const inputClass =
  'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-500';

const emptyForm = {
  code: '',
  type: 'percent',
  value: '',
  minOrder: '',
  maxDiscount: '',
  usageLimit: '',
  perUserLimit: '1',
  expiresAt: '',
};

/** Plain-English summary of what a coupon actually does. */
const describe = (coupon) => {
  const off =
    coupon.type === 'percent' ? `${coupon.value}% off` : `${formatRupees(coupon.value)} off`;

  const parts = [off];
  if (coupon.minOrder > 0) parts.push(`on orders over ${formatRupees(coupon.minOrder)}`);
  if (coupon.maxDiscount) parts.push(`up to ${formatRupees(coupon.maxDiscount)}`);
  return parts.join(', ');
};

const statusOf = (coupon) => {
  if (!coupon.isActive) return { label: 'Off', tone: 'gray' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { label: 'Expired', tone: 'gray' };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { label: 'Used up', tone: 'amber' };
  }
  return { label: 'Live', tone: 'green' };
};

const CouponCard = ({ coupon, onToggle, onDelete }) => {
  const [busy, setBusy] = useState(false);
  const status = statusOf(coupon);

  const tones = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await api.patch(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      onToggle({ ...coupon, isActive: !coupon.isActive });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the code ${coupon.code}?`)) return;
    setBusy(true);
    try {
      await api.delete(`/coupons/${coupon._id}`);
      toast.success(`${coupon.code} deleted`);
      onDelete(coupon._id);
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold tracking-wide text-gray-900 dark:text-white">
              {coupon.code}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tones[status.tone]}`}>
              {status.label}
            </span>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{describe(coupon)}</p>

          <p className="text-[11px] text-gray-400 mt-1.5">
            Used {coupon.usedCount}
            {coupon.usageLimit !== null ? ` of ${coupon.usageLimit}` : ' times'}
            {coupon.expiresAt &&
              ` · ends ${new Date(coupon.expiresAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggle}
            disabled={busy}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 ${
              coupon.isActive
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}
          >
            {busy ? '...' : coupon.isActive ? 'On' : 'Off'}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            aria-label="Delete code"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { coupons: list } = await api.get('/coupons');
      setCoupons(list);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();

    if (!form.code.trim() || !form.value) {
      toast.error('A code and a discount are needed');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        // Percent is a plain number; a flat discount is money, so it converts.
        value: form.type === 'percent' ? Number(form.value) : rupeesToPaise(form.value),
        minOrder: form.minOrder ? rupeesToPaise(form.minOrder) : 0,
        maxDiscount: form.maxDiscount ? rupeesToPaise(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      const { coupon } = await api.post('/coupons', payload);
      toast.success(`${coupon.code} created`);
      setCoupons((current) => [coupon, ...current]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (error) {
      toast.error(error.details?.map((d) => d.message).join('. ') ?? error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Offers</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Discount codes customers can type at checkout
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-xl shadow-smooth shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Code
              </label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="DIWALI20"
                className={`${inputClass} font-mono tracking-wide`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputClass}
              >
                <option value="percent">Percent off</option>
                <option value="flat">Flat rupees off</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                {form.type === 'percent' ? 'Percent' : 'Amount (₹)'}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'percent' ? '20' : '50'}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Minimum order (₹)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={form.minOrder}
                onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                placeholder="Any"
                className={inputClass}
              />
            </div>
          </div>

          {form.type === 'percent' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Most it can take off (₹)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                placeholder="No limit"
                className={inputClass}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Worth setting — without it, 20% off a very large order costs more than you meant.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Total uses
              </label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="∞"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Per customer
              </label>
              <input
                type="number"
                value={form.perUserLimit}
                onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                placeholder="1"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                Ends on
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create code
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Ticket className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No offers yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Create a code and customers can type it at checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon._id}
              coupon={coupon}
              onToggle={(updated) =>
                setCoupons((c) => c.map((x) => (x._id === updated._id ? updated : x)))
              }
              onDelete={(deletedId) => setCoupons((c) => c.filter((x) => x._id !== deletedId))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
