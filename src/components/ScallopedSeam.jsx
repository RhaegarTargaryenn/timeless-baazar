import React, { useId } from 'react';

/**
 * The wavy edge where the white sheet meets the forest header.
 *
 * A plain rounded corner reads as a card sitting on a background. The scallop
 * reads as cloth — it is the detail that makes the header feel like ground the
 * page rests on rather than a bar above it.
 *
 * Drawn as one SVG path of repeating arcs rather than a row of overlapping
 * circles, so it scales to any width without seams showing between segments.
 *
 * @param count  how many arcs across the width
 * @param depth  how far each arc dips, in viewBox units
 */
const ScallopedSeam = ({ count = 7, depth = 26, className = '', fill = 'currentColor' }) => {
  // Gradients and clip paths are document-global; without a unique id, two of
  // these on one page would silently share the first one's definition.
  const id = useId();

  const width = 100;
  const step = width / count;

  // Start past the left edge and finish past the right so the end arcs are cut
  // off by the viewBox instead of ending in a visible flat run.
  let path = `M 0 ${depth}`;
  for (let i = 0; i < count; i += 1) {
    const x = i * step;
    path += ` Q ${x + step / 2} ${-depth * 0.35}, ${x + step} ${depth}`;
  }
  path += ` L ${width} 60 L 0 60 Z`;

  return (
    <svg
      viewBox={`0 0 ${width} 60`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path d={path} fill={fill} id={id} />
    </svg>
  );
};

export default ScallopedSeam;
