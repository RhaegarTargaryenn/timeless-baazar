/** @type {import('tailwindcss').Config} */

/**
 * One set of tokens for the whole app.
 *
 * Before this there were two half-systems: a green palette in the config and an
 * orange one left over in several components, plus `shadow-soft*` defined here
 * and `shadow-smooth*` defined again in index.css. Anything referencing the
 * orange scale rendered as a different product.
 *
 * Colours are CSS variables so light and dark are one definition, not two sets
 * of `dark:` classes on every element.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /**
         * Brand green. 600 is the action colour; 500 is for gradients.
         *
         * 600 is the Nectar green `#53B175` from the Figma source, so every
         * existing `bg-brand-600` picks the design's action colour up without
         * being touched. The rest of the scale is derived around it.
         */
        brand: {
          50: '#F3FAF6',
          100: '#E3F4EA',
          200: '#C7E9D5',
          300: '#9DD8B7',
          400: '#74C495',
          500: '#5FBA83',
          600: '#53B175',
          700: '#45945F',
          800: '#38754C',
          900: '#2C5B3C',
        },

        /**
         * The dark forest green the header and the floating nav are painted in.
         * It is the app's signature -- the white content sits on it like a
         * sheet, with a curved seam between the two.
         */
        forest: {
          DEFAULT: '#0D3B2C',
          light: '#14513C',
          dark: '#08291E',
        },

        /** "See more" links and sale flashes. Warm, so it reads as a nudge. */
        coral: '#E5484D',

        /** Category bubbles. */
        cream: '#F6E7C8',

        // Semantic surfaces, driven by CSS variables in index.css.
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--ink-muted) / <alpha-value>)',
        'ink-faint': 'rgb(var(--ink-faint) / <alpha-value>)',
      },

      /**
       * Inter for Latin, Noto Sans Devanagari for the Hindi product names, then
       * the metric-matched fallback. Font fallback is resolved per character,
       * so a name like "Arhar Dal / अरहर दाल" takes each half from the face
       * that actually has the glyphs.
       */
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Devanagari',
          'Inter Fallback',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },

      // A grocery app reads as friendly through roundness more than colour.
      borderRadius: {
        // 18px -- the radius every card, tile and banner in the design uses.
        card: '1.125rem',
        sheet: '1.75rem',
        // The seam where white content meets the forest header.
        seam: '2rem',
      },

      /**
       * The elevation ramp.
       *
       * Every shadow here is built from three stacked layers, because a single
       * blur is what makes an interface look flat-with-a-smudge-under-it rather
       * than lit. Real objects cast three distinguishable shadows and the eye
       * reads all of them:
       *
       *   1. **Contact** -- 1px, barely blurred, the darkest. This is where the
       *      object meets the surface, and it is the layer that actually sells
       *      the depth. Leaving it out is why most CSS shadows look like fog.
       *   2. **Direct** -- a medium blur offset downward, the cast shadow.
       *   3. **Ambient** -- wide, very faint, no offset to speak of. Occlusion.
       *
       * Alpha roughly halves at each step outward while the blur roughly
       * doubles, so the falloff is smooth rather than banded.
       *
       * The colour is `16 24 40` -- a desaturated navy, not black. A pure-black
       * shadow over a warm white page goes grey and muddy; a cool one stays
       * neutral against the design's `#F2F3F2`.
       */
      boxShadow: {
        card:
          '0 1px 1px rgb(16 24 40 / 0.05), ' +
          '0 2px 6px -1px rgb(16 24 40 / 0.05), ' +
          '0 8px 20px -6px rgb(16 24 40 / 0.06)',
        lift:
          '0 1px 2px rgb(16 24 40 / 0.06), ' +
          '0 6px 12px -3px rgb(16 24 40 / 0.08), ' +
          '0 18px 36px -10px rgb(16 24 40 / 0.10)',
        sheet:
          '0 -1px 2px rgb(16 24 40 / 0.05), ' +
          '0 -8px 20px -6px rgb(16 24 40 / 0.10), ' +
          '0 -24px 56px -16px rgb(16 24 40 / 0.20)',

        // Buttons carry a tinted shadow so the primary action reads as raised
        // rather than merely coloured. Tinted with the button's own green:
        // a neutral shadow under a saturated fill reads as dirt on the page.
        brand:
          '0 1px 2px rgb(56 117 76 / 0.24), ' +
          '0 4px 10px -2px rgb(83 177 117 / 0.32), ' +
          '0 12px 24px -8px rgb(83 177 117 / 0.36)',

        // The floating nav pill needs to read as hovering over the page, so its
        // ambient layer is wider and heavier than a card's -- distance from the
        // surface shows up as blur, not as darkness.
        float:
          '0 1px 2px rgb(13 59 44 / 0.10), ' +
          '0 8px 20px -6px rgb(13 59 44 / 0.18), ' +
          '0 24px 48px -12px rgb(13 59 44 / 0.24)',

        // The bottom bar: a white shelf lifting off the page.
        shelf:
          '0 -1px 2px rgb(16 24 40 / 0.04), ' +
          '0 -8px 24px -8px rgb(16 24 40 / 0.08), ' +
          '0 -20px 48px -16px rgb(16 24 40 / 0.10)',

        /**
         * Pressed.
         *
         * The contact layer alone, tightened. Pairs with the `tap` scale in
         * `lib/motion.js`: a button that shrinks *and* drops toward the page
         * reads as pushed, where scale on its own reads as merely smaller.
         */
        press: '0 1px 1px rgb(16 24 40 / 0.06)',
      },

      // Bottom nav and sheets have to clear the iOS home indicator.
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
        nav: '4.5rem',
      },

      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
