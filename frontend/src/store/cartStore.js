import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The cart.
 *
 * A line is identified by productId + variantId. Prices are integer paise, the
 * same unit the API speaks, and are only ever a display convenience: the server
 * recomputes every total from its own catalogue when the order is placed, so a
 * stale price here shows a wrong subtotal but can never be charged.
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      /**
       * @param product  a product from the API
       * @param variant  one entry from product.variants
       */
      addItem: (product, variant, quantity = 1) => {
        if (!product || !variant || !variant.isActive) return;
        if (!Number.isFinite(variant.price) || variant.price <= 0) return;

        const { items } = get();
        const existingIndex = items.findIndex(
          (item) => item.productId === product._id && item.variantId === variant._id
        );

        if (existingIndex > -1) {
          set({
            items: items.map((item, index) =>
              index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
            ),
          });
          return;
        }

        set({
          items: [
            ...items,
            {
              productId: product._id,
              variantId: variant._id,
              slug: product.slug,
              name: product.name,
              nameHindi: product.nameHindi ?? '',
              variantLabel: variant.label,
              image: product.images?.[0] ?? '',
              price: variant.price,
              quantity,
            },
          ],
        });
      },

      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        });
      },

      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),

      /** Subtotal in paise. Indicative only — the server decides what is charged. */
      getTotal: () =>
        get().items.reduce(
          (total, item) =>
            total + (Number.isFinite(item.price) ? item.price : 0) * item.quantity,
          0
        ),

      getItemQuantity: (productId, variantId) => {
        const item = get().items.find(
          (i) => i.productId === productId && i.variantId === variantId
        );
        return item?.quantity ?? 0;
      },

      /** What POST /api/orders wants: no prices, just what and how many. */
      toOrderItems: () =>
        get().items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
    }),
    {
      name: 'timeless-baazar-cart',

      /**
       * Version 2 changed both the identity of a line (numeric id + a size
       * string, to productId + variantId) and the unit of `price` (rupees to
       * paise). A v1 cart cannot be converted without looking every product up
       * again, and leaving one in place would render ₹132 as ₹1.32 — so it is
       * dropped. Losing a cart is a small annoyance; showing a wrong price is
       * not.
       */
      version: 2,
      migrate: () => ({ items: [] }),
    }
  )
);

export default useCartStore;
