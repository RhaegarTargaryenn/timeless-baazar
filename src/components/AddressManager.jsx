import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, X, Check, Home, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const AddressManager = ({ onSelectAddress, selectedAddressId }) => {
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  const emptyForm = {
    label: 'Home',
    street: '',
    street2: '',
    city: '',
    village: '',
    state: '',
    zipCode: '',
    country: 'India',
    isDefault: false
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAddresses = async () => {
    try {
      const { addresses: list } = await api.get('/addresses');
      setAddresses(list);

      const defaultAddr = list.find((addr) => addr.isDefault);
      if (defaultAddr && !selectedAddressId) {
        onSelectAddress(defaultAddr);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast.error('Could not load your addresses.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingAddress) {
        const { addresses: list } = await api.patch(
          `/addresses/${editingAddress._id}`,
          formData
        );
        setAddresses(list);
        toast.success('Address updated');
      } else {
        const { address, addresses: list } = await api.post('/addresses', formData);
        setAddresses(list);
        // Saving an address mid-checkout almost always means "use this one".
        onSelectAddress(address);
        toast.success('Address saved');
      }

      setShowAddForm(false);
      setEditingAddress(null);
      setFormData(emptyForm);
    } catch (error) {
      toast.error(error.details?.map((d) => d.message).join('. ') ?? error.message);
    }
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setFormData(address);
    setShowAddForm(true);
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      const { addresses: list } = await api.delete(`/addresses/${addressId}`);
      setAddresses(list);
      toast.success('Address deleted');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSetDefault = async (address) => {
    try {
      // One atomic call. The Firestore version looped over every address with a
      // separate write, which could leave two defaults if it failed partway.
      const { addresses: list } = await api.patch(`/addresses/${address._id}/default`);
      setAddresses(list);
      toast.success('Default address updated');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saved Addresses Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Saved Addresses</h3>
      </div>

      {/* Address List */}
      <div className="space-y-3">
        {addresses.map((address, index) => (
          <motion.div
            key={address._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectAddress(address)}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 cursor-pointer transition-all ${
              selectedAddressId === address._id
                ? 'border-green-500 shadow-smooth-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {address.label === 'Home' && <Home className="w-4 h-4 text-green-600" />}
                      {address.label === 'Work' && <Briefcase className="w-4 h-4 text-blue-600" />}
                      <h3 className="font-bold text-gray-900 dark:text-white">{address.label}</h3>
                    </div>
                    {address.isDefault && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">
                    {address.street}
                    {address.street2 && `, ${address.street2}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(address);
                      }}
                      className="text-xs text-green-600 dark:text-green-400 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(address._id);
                      }}
                      className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
                    >
                      Delete
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(address);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        Set as default
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Checkmark */}
              {selectedAddressId === address._id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add New Address Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          setShowAddForm(true);
          setEditingAddress(null);
          setFormData(emptyForm);
        }}
        className="w-full py-4 border-2 border-dashed border-green-300 dark:border-green-700 rounded-2xl text-green-600 dark:text-green-400 font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add New Address
      </motion.button>

      {/* Add/Edit Address Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Address Label */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Address Label
                  </label>
                  <div className="flex gap-3">
                    {['Home', 'Work', 'Other'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormData({ ...formData, label })}
                        className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all ${
                          formData.label === label
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="India"
                  />
                </div>

                {/* Address Line 1 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123 Main Street, Downtown"
                    required
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.street2}
                    onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="789 Business Plaza, Floor 15"
                  />
                </div>

                {/* City and Village */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Brooklyn, NY 11201"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Village
                    </label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="House #5"
                    />
                  </div>
                </div>

                {/* State and Zip Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Manhattan, NY 10016"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Zip Code *
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="9440"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-smooth hover:shadow-smooth-lg transition-all"
                >
                  {editingAddress ? 'Update Address' : 'Save & Continue'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddressManager;
