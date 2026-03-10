/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── PRIMARY BRAND: THE CHALLENGER ──────────────────
        ch: {
          // Amber scale
          amber: {
            light:   '#F7BC57',
            DEFAULT: '#F5A623',
            dark:    '#D4891A',
          },
          // Ink Black
          ink: {
            DEFAULT: '#111111',
            soft:    '#1A1410',
            warm:    '#2C2218',
          },
          // Neutrals
          sand:      '#FDF6EC',
          white:     '#FAFAFA',
          live:      '#FF3B3B',

          // Gray scale
          gray: {
            100: '#F7F3EE',
            200: '#EDE7DC',
            300: '#D4C9B8',
            400: '#A89880',
            500: '#7A6A56',
            600: '#4A3D2E',
            700: '#2C2218',
            800: '#1A1410',
            900: '#0D0A07',
          },
        },

        // Additional palettes available if needed
        'loud-fan': {
          primary: '#E85D04',
          dark:    '#C44D00',
          black:   '#0D0D0D',
          sand:    '#FFF4EE',
        },
        'late-night': {
          gold:    '#C9A84C',
          charcoal:'#141414',
          blue:    '#00A8FF',
          bg:      '#1E1E1E',
        },
        'all-ages': {
          blue:    '#1B4FD8',
          yellow:  '#FFD23F',
          red:     '#E63946',
          bg:      '#F8F9FF',
        },
        counter: {
          green:   '#3DAA51',
          black:   '#000000',
          pink:    '#FF2D78',
          bg:      '#F5FFF7',
        },
        outsider: {
          chartreuse: '#D4F000',
          eggplant:   '#2D0A4E',
          coral:      '#FF4D4D',
          cream:      '#FAF7F0',
        },
        neon: {
          lime:    '#C8FF00',
          navy:    '#0A0F2C',
          pink:    '#FF2D78',
          bg:      '#0F1535',
        },
        underdog: {
          purple:  '#7C3AED',
          yellow:  '#FCD34D',
          bg:      '#FAF5FF',
        },
        roots: {
          green:   '#166534',
          yellow:  '#FEF9C3',
          red:     '#DC2626',
          bg:      '#F7FEF0',
        },
        sunrise: {
          coral:   '#FF6B35',
          yellow:  '#FFBE0B',
          dark:    '#1C1C1C',
          bg:      '#FFF8F4',
        },
      },

      fontFamily: {
        display: ['"Bebas Neue"', '"Anton"', 'sans-serif'],
        heading:  ['"DM Sans"', '"Outfit"', 'sans-serif'],
        body:     ['"DM Sans"', '"Outfit"', 'sans-serif'],
        mono:     ['"JetBrains Mono"', 'monospace'],
      },

      backgroundImage: {
        'ch-primary':  'linear-gradient(135deg, #F5A623 0%, #D4891A 100%)',
        'ch-hero':     'linear-gradient(135deg, #111111 0%, #2C2218 50%, #1A1410 100%)',
        'ch-glow':     'radial-gradient(ellipse at center, rgba(245,166,35,0.15) 0%, transparent 70%)',
        'sunrise-ad':  'linear-gradient(135deg, #FF6B35 0%, #FFBE0B 100%)',
        'neon-dark':   'linear-gradient(135deg, #0A0F2C 0%, #060A1E 100%)',
        'outsider-dark':'linear-gradient(135deg, #2D0A4E 0%, #1A0630 100%)',
      },

      boxShadow: {
        'ch-sm':    '0 1px 3px rgba(17,17,17,0.12)',
        'ch-md':    '0 4px 16px rgba(17,17,17,0.16)',
        'ch-lg':    '0 8px 32px rgba(17,17,17,0.20)',
        'ch-amber': '0 4px 20px rgba(245,166,35,0.35)',
        'ch-live':  '0 0 20px rgba(255,59,59,0.40)',
        'ch-gold':  '0 4px 20px rgba(201,168,76,0.30)',
        'ch-coral': '0 4px 20px rgba(255,107,53,0.35)',
      },

      borderRadius: {
        'ch-sm': '4px',
        'ch-md': '8px',
        'ch-lg': '16px',
        'ch-xl': '24px',
      },

      animation: {
        'ch-pulse':     'ch-pulse 1.5s ease-in-out infinite',
        'ch-mark':      'ch-mark 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ch-bingo':     'ch-bingo 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ch-ring':      'ch-ring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      keyframes: {
        'ch-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'ch-mark': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '60%':  { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'ch-bingo': {
          '0%':   { transform: 'scale(1)' },
          '30%':  { transform: 'scale(1.05)' },
          '60%':  { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        'ch-ring': {
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
