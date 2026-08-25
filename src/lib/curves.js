/**
 * The scalloped-edge motif, as reusable CSS masks.
 *
 * The same arc appears at the seam under the header and along the bottom of
 * every product card. It is the detail that gives the design its character, so
 * it is defined once here rather than redrawn per component.
 *
 * A mask erases `box-shadow` along with everything else outside the shape, so
 * anything using these needs `filter: drop-shadow(...)` on a wrapper instead —
 * drop-shadow follows the alpha channel and so traces the curve.
 */

const svg = (body, width, height, ratio = 'none') =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="${ratio}">${body}</svg>`
  )}")`;

/**
 * One shallow arc cut upward into the bottom edge — the card shape.
 *
 * Stretched to the element rather than tiled: a card wants exactly one arc
 * across its width, however wide it happens to be.
 */
const CARD_MASK = svg(
  '<path d="M0 0 H100 V90 Q50 74 0 90 Z" fill="#fff"/>',
  100,
  100
);

export const scallopedCard = {
  WebkitMaskImage: CARD_MASK,
  maskImage: CARD_MASK,
  WebkitMaskSize: '100% 100%',
  maskSize: '100% 100%',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
};

/**
 * Shadow for a masked element. Two layers, mirroring the `card` box-shadow
 * token — drop-shadow takes no spread, so the tight layer does that job.
 */
export const curvedCardShadow = {
  filter:
    'drop-shadow(0 1px 1px rgb(16 24 40 / 0.05)) drop-shadow(0 6px 10px rgb(16 24 40 / 0.06))',
};
