import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ShoppingCart, Search } from 'lucide-react';

import useCartStore from '../store/cartStore';
import { spring, tap } from '../lib/motion';
import { cx } from './ui';

/**
 * The dark forest band at the top of every storefront screen.
 *
 * White content sits on top of it as a sheet with rounded upper corners, so
 * the two meet in a curved seam. That seam is the whole signature of the
 * design — the header is not a bar, it is the ground the page rests on.
 *
 * `children` renders inside the green, above the seam: the search bar on Home,
 * filter chips on the shop.
 */
const CartButton = () => {
  const count = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

  return (
    <Link to="/cart" className="relative shrink-0" aria-label="Cart">
      <motion.span
        whileTap={tap}
        className="flex w-11 h-11 rounded-full bg-white items-center justify-center text-forest"
      >
        <ShoppingCart className="w-5 h-5" />
      </motion.span>

      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.snappy}
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-forest"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </Link>
  );
};

const ForestHeader = ({
  title,
  showBack = false,
  onBack,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  onSearchFocus,
  children,
  className,
}) => {
  const navigate = useNavigate();

  return (
    <div className={cx('bg-forest text-white', className)}>
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-5">
        <div className="flex items-center gap-3">
          {showBack && (
            <motion.button
              whileTap={tap}
              onClick={() => (onBack ? onBack() : navigate(-1))}
              aria-label="Back"
              className="shrink-0 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
          )}

          {showSearch ? (
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-forest/50" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onFocus={onSearchFocus}
                placeholder='Search for "Grocery"'
                className="w-full h-11 pl-11 pr-4 rounded-full bg-white text-forest text-sm placeholder:text-forest/40 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
          ) : (
            <h1 className="flex-1 text-center text-base font-bold text-white truncate">
              {title}
            </h1>
          )}

          <CartButton />
        </div>

        {children}
      </div>
    </div>
  );
};

/**
 * The white sheet that overlaps the forest band.
 *
 * The negative margin is what creates the seam — the sheet is pulled up over
 * the green so its rounded corners cut into it.
 */
export const Sheet = ({ className, children }) => (
  <div className={cx('relative -mt-4 rounded-t-seam bg-surface min-h-[60vh]', className)}>
    {children}
  </div>
);

export default ForestHeader;
