import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign } from 'lucide-react';
import { FaCcPaypal, FaCcMastercard, FaCcVisa, FaGooglePay } from 'react-icons/fa';
import { SiPhonepe, SiPaytm, SiGooglepay } from 'react-icons/si';

const PaymentMethod = ({ onSelectMethod, selectedMethod }) => {
  const cashMethods = [
    {
      id: 'cod',
      name: 'Cash',
      icon: <DollarSign className="w-6 h-6 text-green-600" />,
      description: 'Cash on Delivery',
      available: true
    }
  ];

  const paymentOptions = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: <FaCcPaypal className="w-6 h-6 text-blue-600" />,
      available: false
    },
    {
      id: 'mastercard',
      name: 'Master',
      icon: <FaCcMastercard className="w-6 h-6 text-orange-600" />,
      available: false
    },
    {
      id: 'visa',
      name: 'Visa',
      icon: <FaCcVisa className="w-6 h-6 text-blue-700" />,
      available: false
    },
    {
      id: 'googlepay',
      name: 'Google Pay',
      icon: <FaGooglePay className="w-6 h-6 text-gray-700" />,
      available: false
    }
  ];

  const upiOptions = [
    {
      id: 'phonepe',
      name: 'PhonePe',
      icon: <SiPhonepe className="w-6 h-6 text-purple-600" />,
      available: false,
      comingSoon: true
    },
    {
      id: 'paytm',
      name: 'Paytm',
      icon: <SiPaytm className="w-6 h-6 text-blue-600" />,
      available: false,
      comingSoon: true
    },
    {
      id: 'gpay',
      name: 'Google Pay UPI',
      icon: <SiGooglepay className="w-6 h-6 text-green-600" />,
      available: false,
      comingSoon: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Cash Section */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Cash</h3>
        <div className="space-y-2">
          {cashMethods.map((method) => (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => method.available && onSelectMethod(method)}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                selectedMethod?.id === method.id
                  ? 'border-green-500 shadow-smooth'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
              } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    {method.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{method.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{method.description}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                  selectedMethod?.id === method.id
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod?.id === method.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payment Options Section */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Payment Option</h3>
        <div className="space-y-2">
          {paymentOptions.map((method) => (
            <motion.div
              key={method.id}
              whileHover={{ scale: method.available ? 1.01 : 1 }}
              whileTap={{ scale: method.available ? 0.99 : 1 }}
              onClick={() => method.available && onSelectMethod(method)}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 transition-all ${
                selectedMethod?.id === method.id
                  ? 'border-green-500 shadow-smooth'
                  : 'border-gray-200 dark:border-gray-700'
              } ${!method.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-green-300 dark:hover:border-green-700'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    {method.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{method.name}</h4>
                      {!method.available && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                  selectedMethod?.id === method.id
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMethod?.id === method.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* UPI Section */}
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">UPI Payment</h3>
        <div className="space-y-2">
          {upiOptions.map((method) => (
            <motion.div
              key={method.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    {method.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 dark:text-white">{method.name}</h4>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add New Card Button (Disabled) */}
      <motion.button
        disabled
        className="w-full py-4 bg-orange-200 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold rounded-2xl opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
      >
        <CreditCard className="w-5 h-5" />
        Add New Card (Coming Soon)
      </motion.button>
    </div>
  );
};

export default PaymentMethod;
