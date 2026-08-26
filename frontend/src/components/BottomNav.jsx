import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

import useCartStore from '../store/cartStore';
import { spring, tap } from '../lib/motion';
import { Store, LayoutGrid, ShoppingCart, Receipt, User } from 'lucide-react';
import { cx } from './ui';

/**
 * The bottom bar from the Figma source (node 1:252).
 *
 * A full-width white shelf with a 15px top radius and a wide, very soft upward
 * shadow -- not the floating pill this app carried before. Icons sit at 24px
 * with a 12px semibold label beneath; the active tab is simply recoloured to
 * brand green, which is the whole of the design's active treatment.
 *
 * Five tabs, as the design draws. The design's fifth is Favourite; this app has
 * no favourites, so Orders takes that slot -- every tab goes somewhere real.
 */
const TABS = [
  { to: '/', label: 'Shop', Icon: Store, end: true },
  { to: '/products', label: 'Explore', Icon: LayoutGrid },
  { to: '/cart', label: 'Cart', Icon: ShoppingCart, badge: true },
  { to: '/track-order', label: 'Orders', Icon: Receipt },
  { to: '/account', label: 'Account', Icon: User },
];

const BottomNav = () => {
  const count = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <nav
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 bg-surface-raised rounded-t-[15px] shadow-shelf"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch">
        {TABS.map(({ to, label, Icon, end, badge }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className="flex flex-col items-center justify-center gap-1 pt-3 pb-2.5"
            >
              {({ isActive }) => (
                <motion.span
                  whileTap={tap}
                  className={cx(
                    'flex flex-col items-center gap-1 transition-colors',
                    isActive ? 'text-brand-600' : 'text-ink'
                  )}
                >
                  <span className="relative flex h-6 items-center">
                    <Icon className="w-6 h-6" strokeWidth={2} />
                    {badge && count > 0 && (
                      <motion.span
                        key={count}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.snappy}
                        className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center"
                      >
                        {count > 9 ? '9+' : count}
                      </motion.span>
                    )}
                  </span>
                  <span className="text-[11px] sm:text-[12px] font-semibold leading-none">{label}</span>
                </motion.span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;
