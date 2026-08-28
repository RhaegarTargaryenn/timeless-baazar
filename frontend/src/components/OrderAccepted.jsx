import React from 'react';
import { motion } from 'framer-motion';

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
 * and it follows the theme.
 *
 * The tick and confetti **are** the designer's export (`Group 6872.svg`),
 * inlined so each piece can animate on its own. They used to be a hand-authored
 * approximation made before the asset existed.
 */

/**
 * The confetti dots, exactly as the file draws them.
 *
 * Circle geometry straight out of `Group 6872.svg` -- the last entry is the
 * mirrored one, resolved from its `matrix(-1 0 0 1 161.739 220)` transform to a
 * plain centre so every dot animates the same way. `stroke` means an outline
 * ring, `fill` a solid dot; the design uses both and they are not
 * interchangeable.
 */
const DOTS = [
  { cx: 132.607, cy: 8.30033, r: 8.30033, fill: '#53B175' },
  { cx: 156.173, cy: 22.3101, r: 4.38348, fill: '#F3603F' },
  { cx: 252.925, cy: 112.7, r: 7.07962, stroke: '#C05EFD' },
  { cx: 59.5592, cy: 86.6854, r: 7.18199, stroke: '#F7B23B' },
  { cx: 77.2041, cy: 207.816, r: 7.94695, stroke: '#53B175' },
  { cx: 157.7035, cy: 224.03543, r: 4.03543, fill: '#53B175' },
  { cx: 181.271, cy: 232.727, r: 7.57962, fill: '#637BFE' },
];

/** The three loose ribbons. Drawn in, in the order the eye reads them. */
const RIBBONS = [
  {
    d: 'M229.055 50.1581C236.964 50.9271 253.507 48.3786 256.407 32.033C259.308 15.6875 267.063 11.1617 270.578 10.942',
    stroke: '#F3603F',
    delay: 0.34,
    duration: 0.45,
  },
  {
    d: 'M1.50037 174.24C12.8286 178.506 37.2507 181.566 44.3126 159.675M44.3126 159.675C45.3425 153.643 44.3127 141.711 31.9546 142.241C29.6006 148.052 28.7765 159.675 44.3126 159.675ZM44.3126 159.675C49.4618 160.631 61.4375 159.719 68.1462 148.42',
    stroke: '#6E89FA',
    delay: 0.38,
    duration: 0.6,
  },
  {
    d: 'M218.026 195.908C225.409 198.04 239.681 206.144 237.712 221.498',
    stroke: '#F7B23B',
    delay: 0.44,
    duration: 0.4,
  },
];

/**
 * Scaling an SVG element about its own middle rather than the canvas origin.
 *
 * Without `fill-box` the transform origin is the top-left of the whole viewBox,
 * so a dot in the corner scales in from across the artboard instead of popping
 * where it sits.
 */
const FROM_CENTRE = { transformBox: 'fill-box', transformOrigin: 'center' };

/**
 * The order-accepted artwork.
 *
 * This is the designer's own `Group 6872.svg`, inlined rather than dropped in
 * as an `<img>`: every piece of it animates separately -- the disc springs in,
 * the tick lands after it, the ribbons draw themselves and the dots pop on a
 * stagger -- and none of that is reachable through an image tag. The paths,
 * radii and colours are the file's, unaltered.
 *
 * It replaces a hand-authored approximation that was built before the asset
 * existed. The real one is asymmetric in a way the approximation was not: the
 * disc sits right of centre with the confetti weighted to the lower left.
 */
const OrderAcceptedArt = () => (
  <svg
    viewBox="0 0 273 241"
    fill="none"
    role="img"
    aria-label="Order accepted"
    className="w-full max-w-[273px] h-auto mx-auto"
  >
    <defs>
      {/* The file's drop shadow on the inner ring. Renamed from Figma's id. */}
      <filter
        id="order-accepted-ring-shadow"
        x="85.678"
        y="46.6899"
        width="146.283"
        height="146.283"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dy="3" />
        <feGaussianBlur stdDeviation="2" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0" />
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
      </filter>
    </defs>

    {RIBBONS.map(({ d, stroke, delay, duration }) => (
      <motion.path
        key={d.slice(0, 24)}
        d={d}
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay, duration, ease: EASE }}
      />
    ))}

    {DOTS.map((dot, index) => (
      <motion.circle
        key={`${dot.cx}-${dot.cy}`}
        cx={dot.cx}
        cy={dot.cy}
        r={dot.r}
        fill={dot.fill ?? 'none'}
        stroke={dot.stroke}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.snappy, delay: 0.3 + index * 0.04 }}
        style={FROM_CENTRE}
      />
    ))}

    {/* The disc and its hairline ring arrive together, as one object. */}
    <motion.g
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...spring.sheet, delay: 0.08 }}
      style={FROM_CENTRE}
    >
      <circle cx="158.82" cy="116.831" r="79.0761" fill="#53B175" />
      <g filter="url(#order-accepted-ring-shadow)">
        <circle
          cx="158.82"
          cy="116.832"
          r="68.1416"
          stroke="white"
          strokeOpacity="0.7"
          strokeWidth="2"
        />
      </g>
    </motion.g>

    {/* The tick lands a beat later, so it reads as confirmation, not decoration. */}
    <motion.path
      d="M193.96 99.5319C193.96 101.685 193.115 103.764 191.579 105.249L155.862 139.848C154.249 141.333 152.099 142.224 149.871 142.224C147.644 142.224 145.493 141.333 143.957 139.848L126.06 122.548C124.524 121.063 123.679 118.985 123.679 116.831C123.679 114.678 124.601 112.674 126.137 111.114C127.75 109.629 129.824 108.813 132.051 108.738C134.279 108.738 136.352 109.555 137.966 111.04L149.871 122.548L179.673 93.7406C181.286 92.2557 183.36 91.439 185.588 91.439C187.815 91.5132 189.889 92.3299 191.502 93.8891C193.038 95.374 193.96 97.3787 193.96 99.5319Z"
      fill="white"
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...spring.snappy, delay: 0.3 }}
      style={FROM_CENTRE}
    />
  </svg>
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
