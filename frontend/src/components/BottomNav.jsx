import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

import useCartStore from '../store/cartStore';
import { haptic } from '../lib/haptics';
import { instant, spring, tap } from '../lib/motion';
import { Store, LayoutGrid, ShoppingCart, Receipt, User } from './icons';
import { cx } from './ui';

/**
 * The floating navigation pill.
 *
 * A glass bar that hovers above the page rather than the full-width shelf the
 * Figma file drew: translucent, blurred, with a hairline and a soft drop
 * shadow, so the content scrolling underneath stays half-visible through it.
 *
 * The selected tab is a solid brand-green disc with a white glyph and label
 * inside it, and that disc is a single shared element -- `layoutId` moves it
 * between tabs instead of fading one out and another in, the same trick the
 * category strip on Home uses and the same spring the Add button rides.
 *
 * Five tabs. The design's fifth is Favourite; this app has no favourites, so
 * Orders takes that slot -- every tab goes somewhere real.
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

  const reduced = useReducedMotion();
  const layoutTransition = reduced ? instant : spring.layout;

  return (
    <nav
      /*
        Inset from the edges so it reads as floating. The bottom offset carries
        the home-indicator inset on top of its own gap -- `viewport-fit=cover`
        is what makes that inset resolve to anything.
      */
      className="sm:hidden fixed inset-x-3 z-40 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <ul
        className={cx(
          'flex items-stretch gap-1 p-1.5 rounded-full',
          // Glass: a translucent ground, blurred, lifted by a hairline and a
          // shadow. `supports` keeps it opaque where backdrop-filter is absent,
          // because half-transparent over unblurred text is unreadable.
          'bg-surface-raised/70 backdrop-blur-xl backdrop-saturate-150',
          'supports-[not(backdrop-filter:blur(0))]:bg-surface-raised',
          // A white hairline on a white bar is invisible; the light theme needs
          // the ordinary rule, and only the dark one wants the bright edge.
          'border border-line dark:border-white/10',
          'shadow-[0_8px_32px_rgba(13,59,44,0.18)]'
        )}
      >
        {TABS.map(({ to, label, Icon, end, badge }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} end={end} className="block">
              {({ isActive }) => (
                <motion.span
                  whileTap={tap}
                  /*
                    Only on a real move. Tapping the tab you are already
                    standing on navigates nowhere, and buzzing for it teaches
                    the customer that the feedback means nothing.
                  */
                  onClick={() => {
                    if (!isActive) haptic('tap');
                  }}
                  className="relative flex flex-col items-center justify-center gap-0.5 h-[54px] rounded-full"
                >
                  {/*
                    One disc for the whole bar, not one per tab: Framer moves
                    this node to whichever tab owns it, so it slides.
                  */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={layoutTransition}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-brand-600 shadow-[0_4px_12px_rgba(83,177,117,0.45)]"
                    />
                  )}

                  <span className="relative flex h-6 items-center">
                    {/*
                      The tab glyph, in two weights stacked.

                      A native tab bar does not merely recolour the selected
                      icon, it fills it -- an outline becomes a solid. Phosphor
                      ships both weights of every glyph, so this is the outline
                      sitting underneath with the solid fading in on top of it
                      rather than two different icons swapping.

                      Crossfaded, not switched: a weight change on its own is a
                      single-frame pop, and at 22px that reads as a glitch. The
                      solid also grows in slightly, so the selected tab looks
                      like it inflated rather than like it was replaced.
                    */}
                    <span
                      className={cx(
                        'relative block w-[22px] h-[22px]',
                        isActive ? 'text-white' : 'text-ink'
                      )}
                    >
                      <Icon className="absolute inset-0 w-full h-full" weight="regular" />
                      <motion.span
                        /*
                          `initial={false}` so the tab that is already active on
                          first paint is simply solid, instead of every mount
                          animating the fill in.
                        */
                        initial={false}
                        animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.7 }}
                        transition={reduced ? instant : spring.snappy}
                        aria-hidden="true"
                        className="absolute inset-0 block"
                      >
                        <Icon className="w-full h-full" weight="fill" />
                      </motion.span>
                    </span>

                    {badge && count > 0 && (
                      <motion.span
                        key={count}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.snappy}
                        className={cx(
                          'absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full',
                          'text-[10px] font-bold flex items-center justify-center',
                          // On the green disc a green badge would vanish, so it
                          // flips to white-on-green there.
                          isActive ? 'bg-white text-brand-700' : 'bg-coral text-white'
                        )}
                      >
                        {count > 9 ? '9+' : count}
                      </motion.span>
                    )}
                  </span>

                  <span
                    className={cx(
                      'relative text-[10px] font-semibold leading-none',
                      isActive ? 'text-white' : 'text-ink-muted'
                    )}
                  >
                    {label}
                  </span>
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
