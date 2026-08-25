import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, LayoutGrid, ShoppingBag, Receipt } from 'lucide-react';

import useCartStore from '../store/cartStore';
import { spring, tap } from '../lib/motion';
import { cx } from './ui';

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/products', label: 'Shop', icon: LayoutGrid },
  { to: '/cart', label: 'Cart', icon: ShoppingBag, badge: true },
  { to: '/track-order', label: 'Orders', icon: Receipt },
];

/**
 * A floating pill rather than a full-width bar: it reads as part of the app
 * rather than part of the phone, and the page scrolls visibly underneath.
 *
 * Icons only. Labels made the pill wide enough to cover product cards, and on a
 * four-tab bar the icons carry the meaning on their own — the active one is
 * marked by a light disc that slides between positions via `layoutId`, so it is
 * one object moving rather than four crossfading.
 */
const BottomNav = () => {
  const count = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <div
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none flex justify-center px-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <nav className="pointer-events-auto flex items-center gap-1 p-2 rounded-full bg-forest shadow-float">
        {TABS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} title={label}>
            {({ isActive }) => (
              <motion.span
                whileTap={tap}
                className={cx(
                  'relative flex items-center justify-center w-14 h-12 rounded-full transition-colors',
                  isActive ? 'text-forest' : 'text-white/55'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-disc"
                    transition={spring.layout}
                    className="absolute inset-0 rounded-full bg-brand-100"
                  />
                )}

                <span className="relative">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.6 : 2} />
                  {badge && count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={spring.snappy}
                      className="absolute -top-2 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      {count > 9 ? '9+' : count}
                    </motion.span>
                  )}
                </span>
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default BottomNav;
