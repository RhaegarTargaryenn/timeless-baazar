import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      // Cart items array
      items: [],

      // Add item to cart
      addItem: (product, quantity = 1, size = '1kg') => {
        const { items } = get();
        const price = size === '1kg' ? product.price1kg : product.price500g;

        // Skip adding items that do not have a final price yet.
        if (!Number.isFinite(price) || price <= 0) {
          return;
        }
        
        // Check if item already exists with same size
        const existingItemIndex = items.findIndex(
          item => item.id === product.id && item.size === size
        );

        if (existingItemIndex > -1) {
          // Update quantity if item exists
          const updatedItems = items.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
          set({ items: updatedItems });
        } else {
          // Add new item
          const newItem = {
            id: product.id,
            name: product.name,
            nameHindi: product.nameHindi,
            category: product.category,
            size,
            price,
            quantity,
            image: product.image,
          };
          set({ items: [...items, newItem] });
        }
      },

      // Remove item from cart
      removeItem: (productId, size) => {
        set({
          items: get().items.filter(
            item => !(item.id === productId && item.size === size)
          ),
        });
      },

      // Update item quantity
      updateQuantity: (productId, size, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, size);
          return;
        }

        const updatedItems = get().items.map(item =>
          item.id === productId && item.size === size
            ? { ...item, quantity }
            : item
        );
        set({ items: updatedItems });
      },

      // Clear entire cart
      clearCart: () => {
        set({ items: [] });
      },

      // Get total items count
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      // Get cart total price
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + ((Number.isFinite(item.price) ? item.price : 0) * item.quantity),
          0
        );
      },

      // Get item count for specific product
      getItemQuantity: (productId, size) => {
        const item = get().items.find(
          item => item.id === productId && item.size === size
        );
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'timeless-baazar-cart', // localStorage key
    }
  )
);

export default useCartStore;
