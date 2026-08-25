import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

import useCartStore from '../store/cartStore';
import { formatRupees } from '../lib/api';
import { Button, EmptyState, Card } from '../components/ui';

const CartLine = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <Card className="p-3">
      <div className="flex gap-3">
        <div className="w-20 h-20 shrink-0 rounded-xl bg-surface-sunken overflow-hidden">
          {item.image ? (
            <img src={item.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🛒</div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink line-clamp-1">{item.name}</h3>
              <p className="text-xs text-ink-faint mt-0.5">
                {item.variantLabel} · {formatRupees(item.price)} each
              </p>
            </div>

            <button
              onClick={() => removeItem(item.productId, item.variantId)}
              aria-label={`Remove ${item.name}`}
              className="shrink-0 w-9 h-9 -mr-1 -mt-1 rounded-lg flex items-center justify-center text-ink-faint hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mt-auto pt-2">
            <div className="inline-flex items-center gap-1 bg-surface-sunken rounded-xl p-0.5">
              <button
                onClick={() =>
                  updateQuantity(item.productId, item.variantId, item.quantity - 1)
                }
                aria-label="Reduce quantity"
                className="w-9 h-9 rounded-lg bg-surface-raised border border-line flex items-center justify-center text-ink"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-9 text-center text-sm font-bold text-ink tabular">
                {item.quantity}
              </span>
              <button
                onClick={() =>
                  updateQuantity(item.productId, item.variantId, item.quantity + 1)
                }
                aria-label="Increase quantity"
                className="w-9 h-9 rounded-lg bg-surface-raised border border-line flex items-center justify-center text-ink"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-base font-extrabold text-ink tabular">
              {formatRupees(item.price * item.quantity)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

/**
 * The cart.
 *
 * It used to redirect straight to /checkout whenever it had anything in it,
 * which meant the cart tab could never be opened to *look* at — a customer
 * adding things over a few minutes had no way to review them without starting
 * checkout.
 */
const Cart = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const subtotal = getTotal();

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Your cart is empty"
          message="Add some dal, rice or masala and it will show up here."
          action={<Button to="/products">Start shopping</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Your cart</h1>
          <p className="text-xs text-ink-faint mt-0.5">
            {items.reduce((sum, item) => sum + item.quantity, 0)} item
            {items.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Empty the whole cart?')) clearCart();
          }}
          className="text-xs font-semibold text-ink-faint hover:text-red-600 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <CartLine key={`${item.productId}-${item.variantId}`} item={item} />
        ))}
      </div>

      {/*
        The figure shown here is indicative. The server recomputes every price
        from the live catalogue when the order is placed, so a stale price can
        be displayed but never charged.
      */}
      <Card className="p-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Subtotal</span>
          <span className="text-xl font-extrabold text-ink tabular">
            {formatRupees(subtotal)}
          </span>
        </div>
        <p className="text-[11px] text-ink-faint mt-1">
          Delivery is free. Pay cash when your order arrives.
        </p>
      </Card>

      {/* Sits above the bottom nav so the primary action is always reachable */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] sm:bottom-4 mt-4 z-30">
        <Button size="lg" fullWidth onClick={() => navigate('/checkout')}>
          Checkout · {formatRupees(subtotal)}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Cart;
