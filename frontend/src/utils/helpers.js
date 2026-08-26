// Format price to Indian Rupee
export const formatPrice = (price) => {
  return `₹${price.toFixed(2)}`;
};

// Format price without decimals
export const formatPriceSimple = (price) => {
  if (!Number.isFinite(price) || price <= 0) {
    return 'Coming Soon';
  }
  return `₹${Math.round(price)}`;
};

// Generate order ID
export const generateOrderId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TB${timestamp}${random}`;
};

// Format date
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Calculate discount
export const calculateDiscount = (originalPrice, discountPercent) => {
  return originalPrice - (originalPrice * discountPercent) / 100;
};

// Validate phone number (Indian)
export const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get category color
export const getCategoryColor = (category) => {
  const colors = {
    daal: 'from-amber-200 to-orange-300',
    rice: 'from-green-200 to-emerald-300',
    flour: 'from-yellow-200 to-amber-300',
    spices: 'from-red-200 to-rose-300',
    snacks: 'from-purple-200 to-pink-300',
    grocery: 'from-blue-200 to-cyan-300',
  };
  return colors[category] || 'from-gray-200 to-gray-300';
};
