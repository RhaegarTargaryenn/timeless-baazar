import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Tag, X, MapPin, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import VerifyEmailGate from '../components/VerifyEmailGate';
import useCartStore from '../store/cartStore';
import { api, formatRupees } from '../lib/api';
import AddressManager from '../components/AddressManager';
import PaymentMethod from '../components/PaymentMethod';
import ForestHeader, { Sheet } from '../components/ForestHeader';
import OrderAccepted from '../components/OrderAccepted';
import { Price } from '../components/ProductCard';
import { pageIn, spring, tap, EASE } from '../lib/motion';
import { cx } from '../components/ui';

const STEPS = [
  { id: 1, label: 'Address', icon: MapPin },
  { id: 2, label: 'Payment', icon: Wallet },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, toOrderItems } = useCartStore();
  const { isVerified } = useAuth();

  // The cart is its own page now, so checkout starts at the address. The old
  // first step just re-listed what /cart already shows.
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    if (items.length === 0 && !orderNumber) navigate('/cart', { replace: true });
  }, [items, orderNumber, navigate]);

  // All paise. Indicative — the server recomputes every figure from its own
  // catalogue when the order is placed.
  const subtotal = getTotal();
  const discount = appliedCoupon?.discount ?? 0;
  const total = subtotal - discount;

  /**
   * Coupons are checked by the API.
   *
   * The old version compared the typed text to the string 'SAVE10' in the
   * browser: readable in devtools, valid forever, reusable without limit. The
   * server also says *why* a code failed, which beats "invalid code".
   */
  const applyCoupon = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;

    setCheckingCoupon(true);
    try {
      const result = await api.post('/coupons/validate', { code, subtotal });
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
      toast.success(`${formatRupees(result.discount)} off applied`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCheckingCoupon(false);
    }
  };

  const placeOrder = async () => {
    if (!selectedAddress || !selectedPayment) return;
    setIsProcessing(true);

    try {
      /**
       * Notice what is not sent: prices, subtotal, total.
       *
       * The request says only what was chosen and how many. The server resolves
       * every price from the live catalogue, re-checks the coupon, computes the
       * total, and writes the Google Sheet with retries.
       */
      const { order } = await api.post('/orders', {
        items: toOrderItems(),
        address: {
          label: selectedAddress.label,
          street: selectedAddress.street,
          street2: selectedAddress.street2 ?? '',
          village: selectedAddress.village ?? '',
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.zipCode,
          country: selectedAddress.country ?? 'India',
          phone: selectedAddress.phone ?? '',
        },
        couponCode: appliedCoupon?.code ?? null,
        paymentMethod: 'cod',
      });

      setOrderNumber(order.orderNumber);
      clearCart();
      toast.success('Order placed!');
    } catch (error) {
      // A 409 means the catalogue moved under the customer — something went out
      // of stock, or a price changed — so show what the server actually said.
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  const next = () => {
    if (step === 1) {
      if (!selectedAddress) {
        toast.error('Pick a delivery address');
        return;
      }
      setStep(2);
      return;
    }
    if (!selectedPayment) {
      toast.error('Pick a payment method');
      return;
    }
    placeOrder();
  };

  // Google accounts arrive verified. An unverified email/password account is
  // stopped here rather than at login — see VerifyEmailGate for why.
  if (!isVerified) return <VerifyEmailGate />;

  // ── Success ─────────────────────────────────────────────────────────────
  if (orderNumber) {
    return (
      <OrderAccepted
        orderNumber={orderNumber}
        onTrack={() => navigate('/track-order')}
        onHome={() => navigate('/')}
      />
    );
  }

  // ── Steps ────────────────────────────────────────────────────────────────
  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      {/*
        Back walks the steps before it leaves the flow -- on step 2 it returns
        to the address, and only from step 1 does it drop out to wherever the
        customer came from.
      */}
      <ForestHeader
        title="Checkout"
        showBack
        onBack={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
        className="[&_h1]:text-white"
      >
        <div className="flex items-center gap-2 mt-5">
          {STEPS.map(({ id, label, icon: Icon }) => {
            const done = step > id;
            const active = step === id;
            return (
              <button
                key={id}
                onClick={() => done && setStep(id)}
                disabled={!done}
                className={cx(
                  'flex-1 flex items-center gap-2 px-3 h-11 rounded-full text-xs font-semibold transition-colors',
                  active && 'bg-white text-forest',
                  done && 'bg-white/15 text-white',
                  !active && !done && 'bg-white/5 text-white/40'
                )}
              >
                <span
                  className={cx(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                    active ? 'bg-forest text-white' : done ? 'bg-brand-500 text-white' : 'bg-white/10'
                  )}
                >
                  {done ? <Check className="w-3 h-3" strokeWidth={3} /> : <Icon className="w-3 h-3" />}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </ForestHeader>

      <Sheet className="px-4 pt-5 pb-36 sm:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            {step === 1 ? (
              <AddressManager
                onSelectAddress={setSelectedAddress}
                selectedAddressId={selectedAddress?._id}
              />
            ) : (
              <>
                <PaymentMethod
                  onSelectMethod={setSelectedPayment}
                  selectedMethod={selectedPayment}
                />

                {/* Coupon */}
                <div className="mt-6">
                  <p className="text-sm font-bold text-ink mb-2">Have a code?</p>
                  {appliedCoupon ? (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900">
                      <Tag className="w-4 h-4 text-brand-700 dark:text-brand-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink font-mono">
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-brand-700 dark:text-brand-400">
                          {formatRupees(appliedCoupon.discount)} off
                        </p>
                      </div>
                      <motion.button
                        whileTap={tap}
                        onClick={() => {
                          setDiscountCode('');
                          setAppliedCoupon(null);
                        }}
                        aria-label="Remove code"
                        className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-ink-muted"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 h-12 px-4 rounded-2xl bg-surface-sunken border border-line text-ink font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      />
                      <motion.button
                        whileTap={tap}
                        onClick={applyCoupon}
                        disabled={checkingCoupon || !discountCode.trim()}
                        className="px-5 h-12 rounded-2xl bg-forest text-white text-sm font-bold disabled:opacity-40"
                      >
                        {checkingCoupon ? '...' : 'Apply'}
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <motion.div layout className="mt-6 p-4 rounded-card bg-surface-sunken">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">Subtotal</span>
                    <span className="font-semibold text-ink tabular">
                      {formatRupees(subtotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center justify-between text-sm mt-2 text-brand-700 dark:text-brand-400"
                    >
                      <span>Discount</span>
                      <span className="font-semibold tabular">−{formatRupees(discount)}</span>
                    </motion.div>
                  )}
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-ink-muted">Delivery</span>
                    <span className="font-semibold text-brand-600">Free</span>
                  </div>
                  <div className="h-px bg-line my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">Total</span>
                    <Price paise={total} className="text-xl" />
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-4 mt-6 z-30">
          <motion.button
            whileTap={tap}
            onClick={next}
            disabled={isProcessing}
            className="w-full h-14 rounded-full bg-brand-600 text-white font-bold shadow-brand flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Placing order...
              </>
            ) : step === 1 ? (
              <>
                Continue to payment
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Place order
                <span className="opacity-70">·</span>
                <span className="tabular">{formatRupees(total)}</span>
              </>
            )}
          </motion.button>
        </div>
      </Sheet>
    </motion.div>
  );
};

export default Checkout;
