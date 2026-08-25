import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Trash2, Plus, Minus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import useCartStore from '../store/cartStore';
import { formatPriceSimple, generateOrderId } from '../utils/helpers';
import { notifyNewOrder } from '../utils/orderNotification';
import AddressManager from '../components/AddressManager';
import PaymentMethod from '../components/PaymentMethod';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, updateQuantity, removeItem, clearCart } = useCartStore();
  const [currentStep, setCurrentStep] = useState(1); // 1: Cart, 2: Address, 3: Payment, 4: Success
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Order data
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        toast.error('Please login to checkout');
        sessionStorage.setItem('returnUrl', '/checkout');
        navigate('/login', { replace: true });
        return;
      }
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && currentStep < 4) {
      navigate('/cart');
    }
  }, [items, currentStep, navigate]);

  const subtotal = getTotal();
  const discount = discountApplied ? subtotal * 0.1 : 0; // 10% discount
  const total = subtotal - discount;

  const handleApplyDiscount = () => {
    if (discountCode.trim().toUpperCase() === 'SAVE10') {
      setDiscountApplied(true);
      toast.success('Discount code applied! 🎉');
    } else {
      toast.error('Invalid discount code');
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setDiscountApplied(false);
    toast.success('Discount removed');
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
    if (!user || !selectedAddress || !selectedPayment) {
      toast.error('Missing order information');
      return;
    }

    setIsProcessing(true);

    try {
      const newOrderId = generateOrderId();
      setOrderId(newOrderId);

      const orderData = {
        orderId: newOrderId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || selectedAddress.label,
        address: selectedAddress,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          nameHindi: item.nameHindi || '',
          size: item.size || '1kg',
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        subtotal: subtotal,
        discount: discount,
        total: total,
        discountCode: discountApplied ? discountCode : null,
        paymentMethod: selectedPayment.name,
        orderDate: new Date().toISOString(),
        status: 'pending',
        createdAt: serverTimestamp()
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('✅ Order saved:', docRef.id);

      // Send notifications
      await notifyNewOrder(orderData);

      // Show success
      setCurrentStep(4);
      
      // Clear cart after a delay
      setTimeout(() => {
        clearCart();
      }, 100);

      toast.success('Order placed successfully! 🎉', { duration: 5000 });
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order. Please try again.');
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

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
                {orderId}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedPayment?.name}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPriceSimple(total)}</span>
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
                  key={`${item.id}-${item.size}`}
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
                          {item.category === 'daal' && '🥘'}
                          {item.category === 'rice' && '🍚'}
                          {item.category === 'flour' && '🌾'}
                          {item.category === 'spices' && '🌶️'}
                          {item.category === 'snacks' && '🍿'}
                          {item.category === 'grocery' && '🛍️'}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1 truncate">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{item.nameHindi || 'original fresh'}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs sm:text-sm font-semibold rounded">
                          {item.size || '1kg'}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {formatPriceSimple(item.price)} each
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.size, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{formatPriceSimple(item.price)}</p>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(item.id, item.size)}
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
                    disabled={discountApplied}
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  {discountApplied ? (
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
                      className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {discountApplied && (
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
                    <span className="font-bold">{formatPriceSimple(subtotal)}</span>
                  </div>
                  {discountApplied && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Discount (10%)</span>
                      <span className="font-bold">- {formatPriceSimple(discount)}</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-green-600 dark:text-green-400">{formatPriceSimple(total)}</span>
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
                selectedAddressId={selectedAddress?.id}
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
