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
 * A floating pill rather than a full-width bar.
 *
 * It reads as part of the app rather than part of the phone, and the page
 * scrolls visibly underneath it. The active tab is marked by a shared pill
 * that slides between positions via `layoutId` — one element moving, not four
 * fading, which is what makes the transition feel physical.
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
      <nav className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-forest shadow-float">
        {TABS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} aria-label={label}>
            {({ isActive }) => (
              <motion.span
                whileTap={tap}
                className={cx(
                  'relative flex items-center justify-center gap-2 h-12 rounded-full transition-colors',
                  isActive ? 'px-4 text-forest' : 'px-4 text-white/60'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={spring.layout}
                    className="absolute inset-0 rounded-full bg-white"
                  />
                )}

                <span className="relative flex items-center gap-2">
                  <span className="relative">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    {badge && count > 0 && (
                      <motion.span
                        key={count}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.snappy}
                        className={cx(
                          'absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                          isActive ? 'bg-coral text-white' : 'bg-coral text-white'
                        )}
                      >
                        {count > 9 ? '9+' : count}
                      </motion.span>
                    )}
                  </span>

                  {/* The label appears only on the active tab, so the pill stays compact */}
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-bold whitespace-nowrap overflow-hidden"
                    >
                      {label}
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
