import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiSearch, HiCheckCircle, HiClock, HiTruck, HiX } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { api, formatRupees } from '../lib/api';
import toast from 'react-hot-toast';

const OrderTracking = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // ProtectedRoute guarantees a signed-in user by the time this renders, so
  // this only has to fetch. Orders come from the API now, not Firestore.
  useEffect(() => {
    if (!user) return undefined;

    const controller = new AbortController();

    const loadOrders = async () => {
      setLoading(true);
      try {
        const { orders } = await api.get('/orders', { signal: controller.signal });
        setMyOrders(orders);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load orders:', error);
        toast.error('Could not load your orders.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadOrders();

    return () => controller.abort();
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!orderId.trim()) {
      return;
    }

    // Search in user's orders from Firestore
    const foundOrder = myOrders.find(o => o.orderNumber === orderId.trim().toUpperCase());
    
    if (foundOrder) {
      setOrder(foundOrder);
      setNotFound(false);
    } else {
      setOrder(null);
      setNotFound(true);
    }
  };

  const getStatusInfo = (status) => {
    const statuses = {
      pending: {
        label: 'Order Received',
        icon: HiClock,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/20',
        description: 'We have received your order and will contact you shortly',
      },
      confirmed: {
        label: 'Order Confirmed',
        icon: HiCheckCircle,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/20',
        description: 'Your order has been confirmed',
      },
      preparing: {
        label: 'Preparing Order',
        icon: HiTruck,
        color: 'text-orange-400',
        bgColor: 'bg-orange-400/20',
        description: 'We are preparing your order for delivery',
      },
      out_for_delivery: {
        label: 'Out for Delivery',
        icon: HiTruck,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/20',
        description: 'Your order is on the way',
      },
      delivered: {
        label: 'Delivered',
        icon: HiCheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-400/20',
        description: 'Order has been delivered successfully',
      },
      cancelled: {
        label: 'Cancelled',
        icon: HiX,
        color: 'text-red-400',
        bgColor: 'bg-red-400/20',
        description: 'This order has been cancelled',
      },
    };
    
    return statuses[status] || statuses.pending;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Track Your Order
          </h1>
          <p className="text-gray-600">Enter your Order ID to check status</p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSearch}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g. TB-2508-0001)"
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-accent-500 transition-colors"
                required
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="px-8 py-4 bg-gradient-to-r from-accent-600 to-accent-700 hover:from-accent-700 hover:to-accent-800 text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <HiSearch className="w-5 h-5" />
              <span>Track Order</span>
            </motion.button>
          </div>
        </motion.form>

        {/* Order Not Found */}
        {notFound && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl border-2 border-red-300 text-center"
          >
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold text-red-600 mb-2">Order Not Found</h3>
            <p className="text-gray-700 mb-4">
              No order found with ID: <span className="font-mono text-accent-600">{orderId}</span>
            </p>
            <p className="text-gray-600 text-sm">
              Please check your Order ID and try again, or contact us for help.
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-accent-600">
                📞 <a href="tel:9266667069" className="hover:underline">9266667069</a>
              </p>
              <p className="text-accent-600">
                📞 <a href="tel:9654653719" className="hover:underline">9654653719</a>
              </p>
            </div>
          </motion.div>
        )}

        {/* Order Details - Modern Design */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {/* Close Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setOrder(null);
                  setOrderId('');
                  setNotFound(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <HiX className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200 space-y-6">
              {/* Header with Order ID and Status */}
              <div className="flex items-start justify-between pb-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Order ID #{order.orderNumber}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(order.orderDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                {(() => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.bgColor}`}>
                      <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      <span className={`text-sm font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Order Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <HiCheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Order Status</p>
                      <p className="text-base font-medium text-gray-900">
                        {getStatusInfo(order.status).description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <HiTruck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="text-base font-medium text-gray-900">
                        {order.paymentMethod || 'Cash on Delivery'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Customer Info</h3>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {order.userName && (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {order.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="text-base font-medium text-gray-900">{order.userName}</p>
                      </div>
                    </div>
                  )}

                  {order.userEmail && (
                    <div className="flex items-center gap-2 pl-13">
                      <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <p className="text-sm text-gray-700">{order.userEmail}</p>
                    </div>
                  )}

                  {order.address && (
                    <div className="flex items-start gap-2 pl-13 pt-2">
                      <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm text-gray-600">Shipping Address</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {order.address.street && `${order.address.street}, `}
                          {order.address.street2 && `${order.address.street2}, `}
                          {order.address.city && `${order.address.city}, `}
                          {order.address.state && `${order.address.state} `}
                          {order.address.zipCode && `- ${order.address.zipCode}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🛒</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.variantLabel} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatRupees(item.price * item.quantity)}
                        </p>
                        <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payment</h3>
                
                <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatRupees(order.subtotal || order.total)}
                    </p>
                  </div>
                  
                  {order.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Discount</p>
                      <p className="text-sm font-medium text-green-600">
                        -{formatRupees(order.discount)}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <p className="text-base font-semibold text-gray-900">Total</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatRupees(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center mb-4">Need help with your order?</p>
                <div className="flex gap-3">
                  <a
                    href={`https://wa.me/919266667069?text=Hi, I have a query about Order ID: ${order.orderNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                      <span>💬</span>
                      WhatsApp Us
                    </button>
                  </a>
                  <a href="tel:9266667069" className="flex-1">
                    <button className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                      <span>📞</span>
                      Call Us
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* My Orders Section - Show if logged in and has orders */}
        {user && myOrders.length > 0 && !order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Recent Orders</h2>
            <div className="space-y-4">
              {myOrders.map((orderItem) => {
                const statusInfo = getStatusInfo(orderItem.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <motion.div
                    key={orderItem.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => {
                      setOrderId(orderItem.orderNumber);
                      setOrder(orderItem);
                      setNotFound(false);
                    }}
                    className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer hover:shadow-xl transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Order ID</p>
                        <p className="text-lg font-bold text-gray-900 font-mono">{orderItem.orderNumber}</p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`text-sm font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">
                          {orderItem.items?.length || 0} items • {formatRupees(orderItem.total)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(orderItem.orderDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">
                        View Details →
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Login Prompt if not logged in */}
        {!user && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 bg-orange-50 border border-orange-200 rounded-xl p-8 text-center"
          >
            <p className="text-gray-700 mb-4">Login to see your order history</p>
            <a href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md"
              >
                Login Now
              </motion.button>
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
