import React from 'react';

/**
 * The wavy edge where the white sheet meets the forest header.
 *
 * A plain rounded corner reads as a card sitting on a background. The scallop
 * reads as cloth — the detail that makes the header feel like ground the page
 * rests on rather than a bar above it.
 *
 * Drawn as a CSS mask that tiles at a fixed pixel width, not a stretched SVG.
 * A stretched one keeps a fixed *number* of arcs, so each one grows with the
 * viewport: tight scallops on a phone become huge slow waves on a desktop. The
 * tile keeps every arc the same size and simply fits more of them across.
 *
 * The colour comes from `bg-surface` on the element, so it follows the theme —
 * a data-URI SVG cannot resolve `currentColor`.
 */

const TILE_WIDTH = 56;
const TILE_HEIGHT = 40;

// White is opaque in a mask. The shape is everything below an upward arc.
const TILE = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}">` +
    `<path d="M0 22 Q ${TILE_WIDTH / 2} -6 ${TILE_WIDTH} 22 L ${TILE_WIDTH} ${TILE_HEIGHT} L 0 ${TILE_HEIGHT} Z" fill="#fff"/>` +
    `</svg>`
);

const maskStyle = {
  WebkitMaskImage: `url("data:image/svg+xml,${TILE}")`,
  maskImage: `url("data:image/svg+xml,${TILE}")`,
  WebkitMaskRepeat: 'repeat-x',
  maskRepeat: 'repeat-x',
  WebkitMaskSize: `${TILE_WIDTH}px ${TILE_HEIGHT}px`,
  maskSize: `${TILE_WIDTH}px ${TILE_HEIGHT}px`,
  WebkitMaskPosition: 'center bottom',
  maskPosition: 'center bottom',
  height: TILE_HEIGHT,
};

const ScallopedSeam = ({ className = '' }) => (
  <div
    aria-hidden="true"
    style={maskStyle}
    className={`w-full bg-surface -mb-px ${className}`}
  />
);

export default ScallopedSeam;
