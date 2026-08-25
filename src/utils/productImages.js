// Product image placeholders using gradient patterns
// Until real images are added, these provide colorful visual representations

export const getProductImage = (productId, category) => {
  // Using placeholder.com or a gradient pattern
  const colors = {
    daal: { bg: 'FFD699', text: '8B4513' },
    rice: { bg: 'C8E6C9', text: '2E7D32' },
    flour: { bg: 'FFF9C4', text: 'F57C00' },
    spices: { bg: 'FFCCBC', text: 'D84315' },
    snacks: { bg: 'E1BEE7', text: '6A1B9A' },
    grocery: { bg: 'B3E5FC', text: '01579B' },
  };

  const color = colors[category] || colors.grocery;
  
  // Using placeholder.com for now
  return `https://via.placeholder.com/400x300/${color.bg}/${color.text}?text=Product+${productId}`;
};

// Product emojis for visual representation
export const getProductEmoji = (category) => {
  const emojis = {
    daal: '🥘',
    rice: '🍚',
    flour: '🌾',
    spices: '🌶️',
    snacks: '🍿',
    grocery: '🛍️',
  };
  return emojis[category] || '🛒';
};

// Generate gradient background for product cards without images
export const getProductGradient = (productId) => {
  const gradients = [
    'from-rose-200 via-pink-200 to-red-200',
    'from-amber-200 via-yellow-200 to-orange-200',
    'from-lime-200 via-green-200 to-emerald-200',
    'from-cyan-200 via-sky-200 to-blue-200',
    'from-violet-200 via-purple-200 to-fuchsia-200',
    'from-orange-200 via-amber-200 to-yellow-200',
  ];
  
  return gradients[productId % gradients.length];
};
