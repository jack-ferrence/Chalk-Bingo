/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── PRIMARY BRAND: DABBER ──────────────────────────────
        db: {
          // Primary — Cinnabar
          primary: {
            light:   '#F0705A',
            DEFAULT: '#E44D2E',
            dark:    '#C93D22',
          },
          // Base — Warm Grey (light theme)
          ink: {
            DEFAULT: '#EDEBE8',
            surface: '#E3E0DC',
            raised:  '#F5F3F0',
          },
          // Semantic
          white:  '#2D2A26',
          live:   '#DC2626',
          warn:   '#D97706',
          info:   '#2563EB',

          // Slate scale — light-first (100=lightest, 900=darkest)
          slate: {
            100: '#F5F3F0',
            200: '#EDEBE8',
            300: '#E3E0DC',
            400: '#D5D0CA',
            500: '#B8B2AA',
            600: '#9A9490',
            700: '#6B6560',
            800: '#5C5752',
            900: '#2D2A26',
          },
        },

      },

      fontFamily: {
        display: ['"Bebas Neue"', '"Anton"', 'sans-serif'],
        heading:  ['"DM Sans"', '"Outfit"', 'sans-serif'],
        body:     ['"DM Sans"', '"Outfit"', 'sans-serif'],
        mono:     ['"JetBrains Mono"', 'monospace'],
      },

      backgroundImage: {
        'db-primary': 'linear-gradient(135deg, #E44D2E 0%, #C93D22 100%)',
        'db-hero':    'linear-gradient(135deg, #EDEBE8 0%, #E3E0DC 50%, #F5F3F0 100%)',
        'db-glow':    'radial-gradient(ellipse at center, rgba(228,77,46,0.06) 0%, transparent 70%)',
      },

      boxShadow: {
        'db-sm':    '0 1px 3px rgba(0,0,0,0.08)',
        'db-md':    '0 4px 16px rgba(0,0,0,0.10)',
        'db-lg':    '0 8px 32px rgba(0,0,0,0.12)',
        'db-glow':  '0 4px 20px rgba(228,77,46,0.20)',
        'db-amber': '0 4px 20px rgba(228,77,46,0.20)', /* alias — keep for class compat */
        'db-live':  '0 0 20px rgba(220,38,38,0.30)',
      },

      borderRadius: {
        'db-sm': '4px',
        'db-md': '8px',
        'db-lg': '16px',
        'db-xl': '24px',
      },

      animation: {
        'db-pulse':     'db-pulse 1.5s ease-in-out infinite',
        'db-mark':      'db-mark 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'db-bingo':     'db-bingo 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'db-ring':      'db-ring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        'db-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'db-mark': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '60%':  { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'db-bingo': {
          '0%':   { transform: 'scale(1)' },
          '30%':  { transform: 'scale(1.05)' },
          '60%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        'db-ring': {
          '0%':   { transform: 'rotate(-15deg)' },
          '25%':  { transform: 'rotate(15deg)' },
          '50%':  { transform: 'rotate(-10deg)' },
          '75%':  { transform: 'rotate(10deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
    },
  },
};
