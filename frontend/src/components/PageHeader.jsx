import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from './icons';

import { tap } from '../lib/motion';
import { cx } from './ui';

/**
 * The title bar every converted screen wears: a centred 20px title over a
 * full-bleed hairline, with an optional back chevron at the left and room for
 * one action at the right.
 *
 * **It sticks.** The design draws these bars at the top of a phone frame, which
 * says nothing about what happens once the list under them is long -- and left
 * static they scrolled away, so getting back meant scrolling to the top first.
 * `top-0` on a phone, `sm:top-14` on a desktop so it lands under the shared
 * header rather than beneath it. The background must stay opaque: the rows
 * passing underneath would otherwise show through.
 *
 * The 48px of headroom is the design's status-bar gap. It is kept because the
 * app installs as a PWA, where that strip is the notch.
 */

/**
 * Whether there is anywhere to go back to.
 *
 * React Router stamps the first entry of a session with the key `default`, so
 * this is true exactly when the user reached the screen from somewhere else
 * inside the app. Opening `/cart` directly in a new tab therefore shows no back
 * chevron, instead of one that would drop the user out of the app.
 */
export const useCanGoBack = () => useLocation().key !== 'default';

/**
 * `below` renders inside the sticky bar, under the title row.
 *
 * A strip that belongs to the header -- a confirmation the header's own action
 * opened, say -- has to travel with it. Rendered as a sibling instead it needs
 * its own `sticky` offset, which means hardcoding this bar's height as a magic
 * number and having the two drift apart the moment the notch inset or the type
 * size changes. Inside, there is no number to get wrong.
 */
const PageHeader = ({ title, back = true, onBack, right, below, className, titleClassName }) => {
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();

  // An explicit handler is a within-screen move (a detail view returning to its
  // list), which is always available; the history fallback is not.
  const showBack = back && (Boolean(onBack) || canGoBack);

  return (
    <header
      className={cx(
        'sticky top-0 sm:top-14 z-30 bg-surface border-b border-line',
        'relative px-[25px] pb-5',
        // The design's 48px of headroom, or the notch plus a little, whichever
        // is larger. With viewport-fit=cover the bar would otherwise sit under it.
        'pt-[max(3rem,calc(env(safe-area-inset-top)+0.75rem))]',
        className
      )}
    >
      {showBack && (
        <motion.button
          whileTap={tap}
          onClick={() => (onBack ? onBack() : navigate(-1))}
          aria-label="Go back"
          className="absolute left-[15px] top-[max(2.625rem,calc(env(safe-area-inset-top)+0.375rem))] w-10 h-10 flex items-center justify-center text-ink"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.button>
      )}

      {/* The title is centred on the bar, so it has to clear both slots. */}
      <h1
        className={cx(
          'text-center text-[20px] font-bold text-ink truncate px-10',
          titleClassName
        )}
      >
        {title}
      </h1>

      {right && (
        <div className="absolute right-[15px] top-[max(2.625rem,calc(env(safe-area-inset-top)+0.375rem))] w-10 h-10 flex items-center justify-center">
          {right}
        </div>
      )}

      {/*
        Outside the padded title row and given its own full-bleed width, so a
        strip here can carry its own background edge to edge rather than sitting
        in a 25px inset gutter.
      */}
      {below && <div className="-mx-[25px] -mb-5 mt-5">{below}</div>}
    </header>
  );
};

export default PageHeader;
