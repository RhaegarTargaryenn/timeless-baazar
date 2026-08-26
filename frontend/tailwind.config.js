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

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },

      // A grocery app reads as friendly through roundness more than colour.
      borderRadius: {
        // 18px -- the radius every card, tile and banner in the design uses.
        card: '1.125rem',
        sheet: '1.75rem',
        // The seam where white content meets the forest header.
        seam: '2rem',
      },

      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 4px 12px -4px rgb(16 24 40 / 0.06)',
        lift: '0 4px 8px -2px rgb(16 24 40 / 0.06), 0 12px 28px -8px rgb(16 24 40 / 0.10)',
        sheet: '0 -8px 40px -12px rgb(16 24 40 / 0.22)',
        // Buttons carry a tinted shadow so the primary action reads as raised
        // rather than merely coloured.
        brand: '0 4px 14px -4px rgb(83 177 117 / 0.45)',
        // The floating nav pill needs to read as hovering over the page.
        float: '0 8px 30px -6px rgb(13 59 44 / 0.35)',
        // The bottom bar: a white shelf lifting off the page.
        shelf: '0 -12px 37px 0 rgb(230 235 243 / 0.5)',
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
