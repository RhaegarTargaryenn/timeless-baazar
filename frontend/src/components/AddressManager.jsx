import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { MapPin, Plus, X, Check, Home, Briefcase, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '../lib/api';
import { spring, tap, sheetMotion, fade, gridItem, gridContainer } from '../lib/motion';
import { cx } from './ui';

const EMPTY = {
  label: 'Home',
  street: '',
  street2: '',
  city: '',
  village: '',
  state: '',
  zipCode: '',
  country: 'India',
  phone: '',
};

const LABEL_ICON = { Home, Work: Briefcase, Other: MapPin };

const inputClass =
  'w-full h-12 px-4 rounded-2xl bg-surface-sunken border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500';

const AddressManager = ({ onSelectAddress, selectedAddressId }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAddresses = async () => {
    try {
      const { addresses: list } = await api.get('/addresses');
      setAddresses(list);

      const preferred = list.find((address) => address.isDefault);
      if (preferred && !selectedAddressId) onSelectAddress(preferred);
    } catch (error) {
      toast.error('Could not load your addresses.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (editing) {
        const { addresses: list } = await api.patch(`/addresses/${editing._id}`, form);
        setAddresses(list);
        toast.success('Address updated');
      } else {
        const { address, addresses: list } = await api.post('/addresses', form);
        setAddresses(list);
        // Saving an address mid-checkout almost always means "use this one".
        onSelectAddress(address);
        toast.success('Address saved');
      }
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY);
    } catch (error) {
      toast.error(error.details?.map((d) => d.message).join('. ') ?? error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const { addresses: list } = await api.delete(`/addresses/${id}`);
      setAddresses(list);
      toast.success('Address deleted');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-bold text-ink mb-3">Where should we deliver?</h2>

      <motion.div
        variants={gridContainer}
        initial="initial"
        animate="animate"
        className="space-y-2.5"
      >
        {addresses.map((address) => {
          const active = selectedAddressId === address._id;
          const Icon = LABEL_ICON[address.label] ?? MapPin;

          return (
            <motion.div
              key={address._id}
              variants={gridItem}
              whileTap={tap}
              onClick={() => onSelectAddress(address)}
              className={cx(
                'relative p-4 rounded-card border-2 cursor-pointer transition-colors',
                active
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-line bg-surface-raised'
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cx(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    active ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-muted'
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{address.label}</span>
                    {address.isDefault && (
                      <span className="px-1.5 py-0.5 rounded-full bg-surface-sunken text-[10px] font-bold text-ink-muted">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    {[address.street, address.street2, address.village]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {address.city}, {address.state} — {address.zipCode}
                  </p>
                  {address.phone && (
                    <p className="text-xs text-ink-faint mt-0.5">{address.phone}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2.5">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(address);
                        setForm({ ...EMPTY, ...address });
                        setFormOpen(true);
                      }}
                      className="text-xs font-semibold text-brand-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        remove(address._id);
                      }}
                      className="text-xs font-semibold text-ink-faint hover:text-coral"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                    className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.button
        whileTap={tap}
        onClick={() => {
          setEditing(null);
          setForm(EMPTY);
          setFormOpen(true);
        }}
        className="w-full mt-3 h-14 rounded-card border-2 border-dashed border-line text-sm font-semibold text-ink-muted flex items-center justify-center gap-2 hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add a new address
      </motion.button>

      {/* Form sheet */}
      {createPortal(
        <AnimatePresence>
          {formOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
              <motion.div
                {...fade}
                onClick={() => setFormOpen(false)}
                className="absolute inset-0 bg-black/50"
                aria-hidden
              />

              <motion.form
                {...sheetMotion}
                onSubmit={submit}
                className="relative w-full sm:max-w-md bg-surface rounded-t-sheet sm:rounded-sheet max-h-[92vh] flex flex-col"
              >
                <div className="shrink-0 flex items-center gap-3 px-5 pt-4 pb-3 border-b border-line">
                  <h3 className="flex-1 text-base font-bold text-ink">
                    {editing ? 'Edit address' : 'New address'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  <div className="flex gap-2">
                    {['Home', 'Work', 'Other'].map((label) => {
                      const Icon = LABEL_ICON[label];
                      const active = form.label === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setForm({ ...form, label })}
                          className={cx(
                            'relative flex-1 h-11 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors',
                            active ? 'text-white' : 'bg-surface-sunken text-ink-muted'
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="address-label"
                              transition={spring.layout}
                              className="absolute inset-0 rounded-2xl bg-forest"
                            />
                          )}
                          <span className="relative flex items-center gap-1.5">
                            <Icon className="w-4 h-4" />
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    required
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    placeholder="House / flat, street *"
                    className={inputClass}
                  />
                  <input
                    value={form.street2}
                    onChange={(e) => setForm({ ...form, street2: e.target.value })}
                    placeholder="Landmark (optional)"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="City *"
                      className={inputClass}
                    />
                    <input
                      value={form.village}
                      onChange={(e) => setForm({ ...form, village: e.target.value })}
                      placeholder="Village"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="State *"
                      className={inputClass}
                    />
                    <input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={form.zipCode}
                      onChange={(e) =>
                        setForm({ ...form, zipCode: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="Pincode *"
                      className={cx(inputClass, 'tabular')}
                    />
                  </div>
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="Mobile number"
                    className={cx(inputClass, 'tabular')}
                  />
                  <p className="text-xs text-ink-faint">
                    We only use your number to call about this delivery.
                  </p>
                </div>

                <div
                  className="shrink-0 px-5 pt-3 border-t border-line"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  <motion.button
                    whileTap={tap}
                    type="submit"
                    disabled={saving}
                    className="w-full h-13 py-3.5 rounded-full bg-brand-600 text-white font-bold shadow-brand disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editing ? 'Save changes' : 'Save address'}
                  </motion.button>
                </div>
              </motion.form>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default AddressManager;
