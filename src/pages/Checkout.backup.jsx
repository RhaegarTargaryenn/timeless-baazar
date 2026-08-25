import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiCheckCircle, HiUser, HiPhone, HiLocationMarker, HiClipboardCopy, HiClipboardCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import useCartStore from '../store/cartStore';
import { formatPriceSimple, validatePhone, generateOrderId } from '../utils/helpers';
import { notifyNewOrder } from '../utils/orderNotification';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔐 Auth State Change - User:', currentUser ? currentUser.uid : 'No user');
      
      if (!currentUser) {
        console.log('❌ No user detected, redirecting to login...');
        toast.error('Please login to place an order');
        // Store current page so we can return after login
        sessionStorage.setItem('returnUrl', '/checkout');
        setAuthLoading(false);
        navigate('/login', { replace: true });
        return;
      }
      
      console.log('✅ User authenticated:', {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      });
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    pincode: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  const total = getTotal();

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId).then(() => {
      setIsCopied(true);
      toast.success('Order ID copied to clipboard!', {
        duration: 2000,
        icon: '📋',
      });
      setTimeout(() => setIsCopied(false), 3000);
    }).catch(() => {
      toast.error('Failed to copy Order ID');
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Invalid pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Triple-check authentication before placing order
    if (!user || !user.uid) {
      console.error('❌ Order submission blocked: No authenticated user');
      toast.error('Please login first to place an order!');
      navigate('/login', { replace: true });
      return;
    }

    console.log('🛒 Order Submission Started for User:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    // Start loading
    setIsLoading(true);

    try {
      // Generate order ID
      const newOrderId = generateOrderId();
      setOrderId(newOrderId);

      // In a real app, you would send this to your backend
      const orderData = {
        orderId: newOrderId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || formData.name,
        customer: formData,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          nameHindi: item.nameHindi || '',
          size: item.size || '1kg',
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        total: total,
        paymentMethod: 'COD',
        orderDate: new Date().toISOString(),
        status: 'pending'
      };

      console.log('📦 Order Data to be saved:', {
        orderId: orderData.orderId,
        userId: orderData.userId,
        userEmail: orderData.userEmail,
        total: orderData.total
      });

      // Save order to Firestore with timestamp
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        createdAt: serverTimestamp()
      });
      
      console.log('✅ Order saved to Firestore with ID:', docRef.id);
      console.log('🔍 This order should be queryable with userId:', orderData.userId);
      
      toast.success('Order saved to database! 🎉', {
        duration: 2000,
      });

      // Send notifications (WhatsApp + Google Sheets + localStorage)
      await notifyNewOrder(orderData);

      // IMPORTANT: Set order placed FIRST, then clear cart
      // This ensures the success screen shows before cart is emptied
      setOrderPlaced(true);
      
      // Small delay to ensure state update completes
      setTimeout(() => {
        clearCart();
      }, 100);
      
      toast.success('Order placed successfully!', {
        duration: 5000,
        icon: '🎉',
      });
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (safety check)
  if (!user) {
    console.log('🚫 User not authenticated, redirecting...');
    navigate('/login', { replace: true });
    return null;
  }

  if (items.length === 0 && !orderPlaced) {
    navigate('/cart');
    return null;
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-8xl mb-6"
            >
              <HiCheckCircle className="w-32 h-32 mx-auto text-success-600" />
            </motion.div>

            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Order Placed Successfully!
            </h2>

            <div className="bg-accent-50 border-2 border-accent-300 rounded-xl p-6 mb-6">
              <p className="text-gray-600 mb-3 text-sm font-medium">Your Order Tracking ID</p>
              <div className="flex items-center justify-center gap-3 mb-3">
                <p className="text-2xl md:text-3xl font-bold text-accent-600 font-mono tracking-wide">{orderId}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyOrderId}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 mx-auto ${
                  isCopied
                    ? 'bg-success-600 text-white'
                    : 'bg-accent-600 hover:bg-accent-700 text-white'
                }`}
              >
                {isCopied ? (
                  <>
                    <HiClipboardCheck className="w-5 h-5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <HiClipboardCopy className="w-5 h-5" />
                    <span>Copy Order ID</span>
                  </>
                )}
              </motion.button>
              <p className="text-xs text-gray-500 mt-3">
                Save this ID to track your order status
              </p>
            </div>

            <p className="text-gray-700 text-lg mb-6">
              Thank you for your order! We will call you shortly to confirm.
            </p>

            <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Payment Method:</span> Cash on Delivery (COD)
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Total Amount:</span>{' '}
                <span className="text-2xl font-bold text-accent-600">{formatPriceSimple(total)}</span>
              </p>
            </div>

            <div className="space-y-2 mb-6 text-gray-700">
              <p>📞 We will contact you at: <span className="font-bold">{formData.phone}</span></p>
              <p>📍 Delivery to: <span className="font-bold">{formData.city}</span></p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/track-order')}
                className="bg-gradient-to-r from-accent-600 to-accent-700 text-white px-8 py-3 rounded-xl font-bold shadow-xl"
              >
                Track Order
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/products')}
                className="bg-white border-2 border-accent-600 text-accent-600 hover:bg-accent-50 px-8 py-3 rounded-xl font-bold shadow-xl transition-colors"
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Checkout
          </h1>
          <p className="text-gray-600">Complete your order</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <motion.form
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Information</h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    <HiUser className="inline w-5 h-5 mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white border-2 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    <HiPhone className="inline w-5 h-5 mr-2" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white border-2 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors`}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                  />
                  {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    <HiLocationMarker className="inline w-5 h-5 mr-2" />
                    Complete Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className={`w-full px-4 py-3 bg-white border-2 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors`}
                    placeholder="House No., Street, Area"
                  />
                  {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors"
                    placeholder="Near market, temple, etc."
                  />
                </div>

                {/* City & Pincode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white border-2 ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors`}
                      placeholder="City"
                    />
                    {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Pincode *</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white border-2 ${
                        errors.pincode ? 'border-red-500' : 'border-gray-300'
                      } rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors`}
                      placeholder="6-digit pincode"
                      maxLength="6"
                    />
                    {errors.pincode && (
                      <p className="text-red-600 text-sm mt-1">{errors.pincode}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-accent-500 transition-colors"
                    placeholder="Any special requests or delivery instructions"
                  />
                </div>
              </div>

              <motion.button
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                type="submit"
                disabled={isLoading}
                className={`w-full mt-6 font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-accent-600 to-accent-700 hover:from-accent-700 hover:to-accent-800 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <span>Place Order (Cash on Delivery)</span>
                )}
              </motion.button>
            </motion.form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 sticky top-24"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.name} ({item.size}) x {item.quantity}
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {formatPriceSimple(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPriceSimple(total)}</span>
                </div>

                <div className="flex justify-between text-gray-700">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-success-600">FREE</span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-2xl font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-accent-600">{formatPriceSimple(total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-success-50 border border-success-200 rounded-lg">
                <p className="text-sm text-success-800 text-center font-semibold">
                  💰 Cash on Delivery
                </p>
                <p className="text-xs text-success-700 text-center mt-1">
                  Pay when you receive your order
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
