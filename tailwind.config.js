/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── PRIMARY BRAND: THE CHALLENGER ──────────────────
        ch: {
          // Primary — Electric Green
          green: {
            light:   '#69F0AE',
            DEFAULT: '#00E676',
            dark:    '#00C853',
          },
          // Base — Deep Navy Black
          ink: {
            DEFAULT: '#0A0E17',
            surface: '#111827',
            raised:  '#1A2235',
          },
          // Semantic
          white:  '#F1F5F9',
          live:   '#EF4444',
          warn:   '#F59E0B',
          info:   '#3B82F6',

          // Slate scale — dark-first (100=darkest, 900=lightest)
          slate: {
            100: '#1A2235',
            200: '#1E293B',
            300: '#334155',
            400: '#475569',
            500: '#64748B',
            600: '#94A3B8',
            700: '#CBD5E1',
            800: '#E2E8F0',
            900: '#F1F5F9',
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
        'ch-primary': 'linear-gradient(135deg, #00E676 0%, #00C853 100%)',
        'ch-hero':    'linear-gradient(135deg, #0A0E17 0%, #111827 50%, #0F172A 100%)',
        'ch-glow':    'radial-gradient(ellipse at center, rgba(0,230,118,0.08) 0%, transparent 70%)',
      },

      boxShadow: {
        'ch-sm':    '0 1px 3px rgba(0,0,0,0.30)',
        'ch-md':    '0 4px 16px rgba(0,0,0,0.40)',
        'ch-lg':    '0 8px 32px rgba(0,0,0,0.50)',
        'ch-glow':  '0 4px 20px rgba(0,230,118,0.25)',
        'ch-amber': '0 4px 20px rgba(0,230,118,0.25)', /* alias — keep for class compat */
        'ch-live':  '0 0 20px rgba(239,68,68,0.40)',
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
