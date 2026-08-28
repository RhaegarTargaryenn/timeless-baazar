import React from 'react';
import { motion } from 'framer-motion';
import { Check } from './icons';

import { EASE, spring, tap } from '../lib/motion';

/**
 * The order confirmation, from the Figma source (node `1:1820`).
 *
 * A pale wash of colour behind a green tick and a scatter of confetti, then the
 * headline, a line of reassurance, and two actions: Track Order in brand green
 * and a plain Back to home beneath it.
 *
 * The background in the design is a photograph under a 45px blur. It is drawn
 * here as overlapping radial gradients instead -- same effect, no 300 kB image,
 * and it follows the theme. The tick and confetti are likewise authored rather
 * than exported: they are circles, dots and two curves.
 */

/** The confetti scatter. Positions are the design's, as percentages of the box. */
const CONFETTI = [
  { x: '42%', y: '2%', size: 15, color: '#53B175', filled: true },
  { x: '55%', y: '11%', size: 9, color: '#F3603F', filled: true },
  { x: '19%', y: '25%', size: 12, color: '#F8A44C' },
  { x: '84%', y: '31%', size: 12, color: '#9C6AE0' },
  { x: '25%', y: '78%', size: 13, color: '#53B175' },
  { x: '54%', y: '82%', size: 8, color: '#53B175', filled: true },
  { x: '63%', y: '85%', size: 15, color: '#5468FF', filled: true },
];

const OrderAcceptedArt = () => (
  <div className="relative w-[269px] h-[240px] mx-auto">
    {/* Two loose ribbons, one each side */}
    <svg
      viewBox="0 0 269 240"
      fill="none"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
    >
      <motion.path
        d="M186 40 C 206 22, 206 54, 219 40 C 228 30, 224 16, 218 8"
        stroke="#F3603F"
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
      />
      <motion.path
        d="M20 168 C 44 190, 66 178, 62 162 C 59 150, 42 152, 46 168 C 50 184, 70 180, 80 166"
        stroke="#5468FF"
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.55, ease: EASE }}
      />
      <motion.path
        d="M186 196 C 202 194, 214 182, 216 166"
        stroke="#F8A44C"
        strokeWidth="4.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.45, ease: EASE }}
      />
    </svg>

    {CONFETTI.map((dot, index) => (
      <motion.span
        key={`${dot.x}-${dot.y}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.snappy, delay: 0.3 + index * 0.04 }}
        style={{
          left: dot.x,
          top: dot.y,
          width: dot.size,
          height: dot.size,
          backgroundColor: dot.filled ? dot.color : 'transparent',
          border: dot.filled ? 'none' : `2px solid ${dot.color}`,
        }}
        className="absolute rounded-full"
      />
    ))}

    {/* The tick: a filled disc with a hairline ring inside it. */}
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...spring.sheet, delay: 0.1 }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[172px] h-[172px] rounded-full bg-brand-600 flex items-center justify-center"
    >
      <span className="absolute inset-[9px] rounded-full border-2 border-white/35" />
      <motion.span
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.snappy, delay: 0.32 }}
      >
        <Check className="w-[74px] h-[74px] text-white" />
      </motion.span>
    </motion.div>
  </div>
);

const OrderAccepted = ({ orderNumber, onTrack, onHome }) => (
  <div className="relative min-h-screen bg-surface overflow-hidden flex flex-col">
    {/*
      The design's blurred backdrop, as gradients. Kept very pale so the ink on
      top stays at full contrast.
    */}
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-25"
      style={{
        backgroundImage: [
          'radial-gradient(52% 34% at 12% 6%, rgba(248,164,76,0.28), transparent 70%)',
          'radial-gradient(46% 30% at 88% 14%, rgba(215,59,119,0.20), transparent 70%)',
          'radial-gradient(60% 36% at 76% 52%, rgba(83,177,117,0.22), transparent 72%)',
          'radial-gradient(54% 32% at 8% 62%, rgba(131,106,246,0.18), transparent 72%)',
          'radial-gradient(70% 40% at 50% 100%, rgba(183,223,245,0.30), transparent 74%)',
        ].join(','),
      }}
    />

    <div className="relative flex-1 flex flex-col items-center justify-center px-[25px] pt-16">
      <OrderAcceptedArt />

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
        className="mt-12 text-center text-[28px] font-semibold text-ink leading-tight"
      >
        Your Order has been accepted
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 max-w-[290px] text-center text-[16px] leading-[21px] text-ink-muted"
      >
        Your items have been placed and are on their way to being processed.
      </motion.p>

      {/*
        Not in the design, but the shop reads orders off a Google Sheet by
        number and customers ring up quoting it, so it has to be on screen.
      */}
      {orderNumber && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48 }}
          className="mt-5 text-center text-[13px] text-ink-faint"
        >
          Order <span className="font-semibold text-ink tracking-wide">{orderNumber}</span>
        </motion.p>
      )}
    </div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4, ease: EASE }}
      className="relative px-[25px] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <motion.button
        whileTap={tap}
        onClick={onTrack}
        className="w-full h-[67px] rounded-[19px] bg-brand-600 text-[#FFF9FF] text-[18px] font-semibold"
      >
        Track Order
      </motion.button>

      <motion.button
        whileTap={tap}
        onClick={onHome}
        className="w-full h-[67px] rounded-[19px] text-ink text-[18px] font-semibold"
      >
        Back to home
      </motion.button>
    </motion.div>
  </div>
);

export default OrderAccepted;
