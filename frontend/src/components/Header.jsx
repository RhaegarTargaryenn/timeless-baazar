import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { Search, ShoppingBag, Moon, Sun, LogOut, User, Shield } from './icons';
import toast from 'react-hot-toast';

import useCartStore from '../store/cartStore';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { IconButton, Button, cx } from './ui';

/**
 * The desktop counterpart of BottomNav's five tabs. Cart is missing on purpose
 * -- it already sits in the action row as an icon with the item badge. `auth`
 * links go nowhere but the login screen when signed out, so they stay hidden.
 */
const DESKTOP_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Shop' },
  { to: '/track-order', label: 'Orders', auth: true },
  { to: '/account', label: 'Account', auth: true },
];

/**
 * Top bar.
 *
 * On phones this is deliberately thin — brand, search, cart — because
 * BottomNav carries navigation. The old header packed logo, search, install
 * prompt, cart and a hamburger containing everything else into 72px, and the
 * menu hid the links customers actually needed.
 *
 * `className` exists for the screens that paint their own header on a phone.
 * BottomNav is hidden from `sm` up, so those screens still need this bar on a
 * desktop or there is no navigation at all — they pass `hidden sm:block`
 * rather than dropping the header outright.
 */
const Header = ({ className }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const totalItems = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const { isDark, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();

  const submitSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/');
  };

  return (
    <header
      className={cx(
        'sticky top-0 z-40 bg-surface-raised/90 backdrop-blur border-b border-line',
        className
      )}
    >
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-14 flex items-center gap-3">
          {/*
            The mark never shrinks; the wordmark truncates. On a 320px phone
            the actions must stay reachable, and a clipped icon row is worse
            than a clipped name.
          */}
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm">
              TB
            </div>
            <span className="font-extrabold text-ink tracking-tight truncate">
              Timeless Baazar
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 ml-4">
            {DESKTOP_LINKS.filter(({ auth }) => !auth || user).map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                    isActive ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/40' : 'text-ink-muted hover:text-ink'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            <IconButton label="Search" onClick={() => setSearchOpen((open) => !open)}>
              <Search className="w-5 h-5" />
            </IconButton>

            <IconButton label={isDark ? 'Light mode' : 'Dark mode'} onClick={toggleTheme}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </IconButton>

            {isAdmin && (
              <Link to="/admin/products">
                <IconButton label="Shop admin" as="span">
                  <Shield className="w-5 h-5" />
                </IconButton>
              </Link>
            )}

            {/* Cart lives in the bottom nav on phones; only needed here on wide screens */}
            <Link to="/cart" className="hidden sm:block relative">
              <IconButton label="Cart" as="span">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </IconButton>
            </Link>

            {user ? (
              <IconButton label="Sign out" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </IconButton>
            ) : (
              <Button to="/login" size="sm" className="ml-1">
                <User className="w-4 h-4" />
                Sign in
              </Button>
            )}
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={submitSearch} className="pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dal, rice, masala..."
                className="w-full h-11 pl-11 pr-4 rounded-2xl bg-surface-sunken border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              />
            </div>
          </form>
        )}
      </div>
    </header>
  );
};

export default Header;
