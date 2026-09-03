import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Ticket, Store, LogOut, Receipt, LayoutGrid
} from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { haptic } from '../../lib/haptics';
import { spring, tap } from '../../lib/motion';
import { cx } from '../../components/ui';

/**
 * Orders sits first.
 *
 * It is the only screen here with anything time-sensitive on it: a customer is
 * waiting at the other end of every row. Products and Offers are edited when
 * the client feels like it.
 */
const NAV = [
  // `end` because this one sits at the index route: without it every /admin/*
  // path counts as a match and Dashboard stays lit on every screen.
  { to: '/admin', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/admin/orders', label: 'Orders', icon: Receipt },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/coupons', label: 'Offers', icon: Ticket },
];

/**
 * Shell for the admin panel.
 *
 * Built phone-first: the client runs a shop and will be doing this standing at
 * a counter, not sitting at a desk. Navigation is a bottom bar on small screens
 * — thumb-reachable — and moves to the top on anything wider.
 */
const AdminLayout = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-surface-sunken pb-24 sm:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-forest">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
              TB
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">
                Shop Admin
              </p>
              <p className="text-[11px] text-white/50 truncate">
                {profile?.email}
              </p>
            </div>
          </div>

          {/* Wide screens: nav lives up here */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                {({ isActive }) => (
                  <span
                    className={cx(
                      'flex items-center gap-2 px-3.5 h-10 rounded-full text-sm font-semibold transition-colors',
                      isActive ? 'bg-white text-forest' : 'text-white/60 hover:text-white'
                    )}
                  >
                    {/* Filled when selected, same as the phone bar and the storefront. */}
                    <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
                    {label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/"
              title="View the shop"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
            >
              <Store className="w-5 h-5" />
            </Link>
            <button
              onClick={signOut}
              title="Sign out"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-coral transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        <Outlet />
      </main>

      {/*
        Phones: a floating pill, the same shape the storefront uses.

        **Only the selected tab carries its label.** Three tabs at the old fixed
        width came to roughly 354px before the outer padding, which does not fit
        a 375px phone -- the bar would have wrapped or been clipped. Labelling
        just the active one keeps the row narrow, and it is the pattern both
        platforms already use for exactly this reason. The label is what grows,
        so the white pill stretching between tabs stays one continuous shape
        rather than a block that jumps and then resizes.
      */}
      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none flex justify-center px-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <nav className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-forest shadow-float">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={label}>
              {({ isActive }) => (
                <motion.span
                  whileTap={tap}
                  onClick={() => {
                    if (!isActive) haptic('tap');
                  }}
                  layout
                  transition={spring.layout}
                  className={cx(
                    'relative flex items-center h-12 rounded-full transition-colors',
                    isActive ? 'text-forest px-4' : 'text-white/60 px-3.5'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="admin-nav-pill"
                      transition={spring.layout}
                      className="absolute inset-0 rounded-full bg-white"
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon className="w-5 h-5 shrink-0" weight={isActive ? 'fill' : 'regular'} />
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={spring.layout}
                          className="text-sm font-bold whitespace-nowrap overflow-hidden"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

    </div>
  );
};

export default AdminLayout;
