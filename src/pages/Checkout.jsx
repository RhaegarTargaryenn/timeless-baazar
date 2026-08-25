import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Trash2, Plus, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import VerifyEmailGate from '../components/VerifyEmailGate';
import useCartStore from '../store/cartStore';
import { api, formatRupees } from '../lib/api';
import AddressManager from '../components/AddressManager';
import PaymentMethod from '../components/PaymentMethod';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, updateQuantity, removeItem, clearCart, toOrderItems } = useCartStore();
  const [currentStep, setCurrentStep] = useState(1); // 1: Cart, 2: Address, 3: Payment, 4: Success
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, isVerified } = useAuth();
  
  // Order data
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount }
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && currentStep < 4) {
      navigate('/cart');
    }
  }, [items, currentStep, navigate]);

  // All paise. These figures are indicative -- the server recomputes every one
  // of them from its own catalogue when the order is placed.
  const subtotal = getTotal();
  const discount = appliedCoupon?.discount ?? 0;
  const total = subtotal - discount;

  /**
   * Coupons are checked by the API now.
   *
   * The old version compared the typed text to the string 'SAVE10' in the
   * browser: readable in devtools, valid forever, and reusable without limit.
   * The server also tells us *why* a code failed, which is far more useful than
   * "invalid code".
   */
  const handleApplyDiscount = async () => {
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

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setAppliedCoupon(null);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Cart validation
      if (items.length === 0) {
        toast.error('Your cart is empty');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Address validation
      if (!selectedAddress) {
        toast.error('Please select a delivery address');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Payment validation
      if (!selectedPayment) {
        toast.error('Please select a payment method');
        return;
      }
      handlePlaceOrder();
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || !selectedPayment) {
      toast.error('Missing order information');
      return;
    }

    setIsProcessing(true);

    try {
      /**
       * Notice what is not sent: prices, subtotal, total.
       *
       * The request says only what was chosen and how many. The server resolves
       * every price from the live catalogue, re-checks the coupon, and computes
       * the total itself. It also writes the Google Sheet, with retries, rather
       * than the browser firing a no-cors request it can never read the result
       * of.
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
      setPlacedOrder(order);
      setCurrentStep(4);
      clearCart();

      toast.success('Order placed!', { duration: 4000 });
    } catch (error) {
      // A 409 means the catalogue moved under the customer -- something went
      // out of stock, or a price changed -- so say that rather than "failed".
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  // Success Screen
  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900/10 dark:to-gray-800 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-smooth-lg border border-green-200 dark:border-green-800"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>

            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              Order Placed Successfully!
            </h2>

            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">Order ID</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 text-center font-mono tracking-wider">
                {orderNumber}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedPayment?.name}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatRupees(total)}</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delivery Address</p>
                <p className="font-bold text-gray-900 dark:text-white">{selectedAddress?.street}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAddress?.city}, {selectedAddress?.state} {selectedAddress?.zipCode}
                </p>
              </div>
            </div>

            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              We will contact you shortly to confirm your order.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/track-order')}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all"
              >
                Track Order
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/products')}
                className="flex-1 py-4 bg-white dark:bg-gray-700 border-2 border-green-500 text-green-600 dark:text-green-400 font-bold rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
              >
                Continue Shopping
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/cart')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {currentStep === 1 && 'My Cart'}
            {currentStep === 2 && 'Manage Addresses'}
            {currentStep === 3 && 'Payment Methods'}
          </h1>
        </motion.div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step < currentStep
                  ? 'bg-green-600 text-white'
                  : step === currentStep
                  ? 'bg-green-600 text-white ring-4 ring-green-200 dark:ring-green-900/50'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step < currentStep ? <Check className="w-5 h-5" /> : step}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                  step < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Cart Summary */}
          {currentStep === 1 && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Cart Items */}
              {items.map((item, index) => (
                <motion.div
                  key={`${item.productId}-${item.variantId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-smooth border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-700 dark:via-green-900/20 dark:to-gray-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span className="text-4xl">
                          </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1 truncate">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{item.nameHindi || 'original fresh'}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs sm:text-sm font-semibold rounded">
                          {item.variantLabel}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {formatRupees(item.price)} each
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.variantId, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{formatRupees(item.price * item.quantity)}</p>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Discount Code */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-smooth border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter Discount Code"
                    disabled={Boolean(appliedCoupon) || checkingCoupon}
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  {appliedCoupon ? (
                    <button
                      onClick={handleRemoveDiscount}
                      className="px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyDiscount}
                      disabled={checkingCoupon || !discountCode.trim()}
                      className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {checkingCoupon ? 'Checking...' : 'Apply'}
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Discount code applied successfully!
                  </p>
                )}
              </div>

              {/* Order Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-smooth border border-gray-200 dark:border-gray-700">
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-bold">{formatRupees(subtotal)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span className="font-bold">- {formatRupees(discount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-green-600 dark:text-green-400">{formatRupees(total)}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextStep}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all flex items-center justify-center gap-2"
                >
                  Checkout
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Address Selection */}
          {currentStep === 2 && (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AddressManager
                onSelectAddress={setSelectedAddress}
                selectedAddressId={selectedAddress?._id}
              />

              {/* Continue Button */}
              {selectedAddress && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextStep}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all flex items-center justify-center gap-2"
                >
                  Continue to Payment
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Step 3: Payment Method */}
          {currentStep === 3 && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PaymentMethod
                onSelectMethod={setSelectedPayment}
                selectedMethod={selectedPayment}
              />

              {/* Continue Button */}
              {selectedPayment && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextStep}
                  disabled={isProcessing}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Place Order
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Checkout;
