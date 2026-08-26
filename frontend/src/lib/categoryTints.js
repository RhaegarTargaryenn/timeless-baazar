/**
 * The category tint palette, from the Figma source.
 *
 * The Explore grid (node `1:749`) paints every tile a different hue: a very
 * light fill with a stronger border of the same colour. Home's category rail
 * uses the same hues as a flat wash. Both read from here, so a category the
 * client adds later gets a colour without either screen being edited, and the
 * two screens never disagree about which colour a category is.
 *
 * The list cycles. Order matters only in that it should not put two similar
 * hues next to each other in a two-column grid.
 */
export const CATEGORY_TINTS = [
  { hue: '#53B175', bg: 'rgba(83, 177, 117, 0.10)', border: 'rgba(83, 177, 117, 0.70)' },
  { hue: '#F8A44C', bg: 'rgba(248, 164, 76, 0.10)', border: 'rgba(248, 164, 76, 0.70)' },
  { hue: '#F7A593', bg: 'rgba(247, 165, 147, 0.25)', border: '#F7A593' },
  { hue: '#D3B0E0', bg: 'rgba(211, 176, 224, 0.25)', border: '#D3B0E0' },
  { hue: '#FDE598', bg: 'rgba(253, 229, 152, 0.25)', border: '#FDE598' },
  { hue: '#B7DFF5', bg: 'rgba(183, 223, 245, 0.25)', border: '#B7DFF5' },
  { hue: '#836AF6', bg: 'rgba(131, 106, 246, 0.15)', border: 'rgba(131, 106, 246, 0.50)' },
  { hue: '#D73B77', bg: 'rgba(215, 59, 119, 0.15)', border: 'rgba(215, 59, 119, 0.50)' },
];

export const tintFor = (index) => CATEGORY_TINTS[index % CATEGORY_TINTS.length];

export default CATEGORY_TINTS;
