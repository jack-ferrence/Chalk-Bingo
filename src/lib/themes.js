// Cowbell theme definitions
// --------------------------
// Each key here is used in:
//   - profiles.user_theme
//   - rooms.room_theme
//   - ThemePicker / ThemeContext
//
// The `dataTheme` value maps to the CSS selectors in cowbell-brand.css:
//   :root                           → challenger (no data-theme attribute)
//   [data-theme="loud-fan"]         → loudFan
//   [data-theme="late-night"]       → lateNight
//   [data-theme="all-ages"]         → allAges
//   [data-theme="counterintuitive"] → counterintuitive
//   [data-theme="bold-outsider"]    → boldOutsider
//   [data-theme="neon-night"]       → neonNight
//   [data-theme="underdog"]         → underdog
//   [data-theme="grassroots"]       → grassroots
//   [data-theme="sunrise"]          → sunrise

export const THEMES = {
  challenger: {
    label: 'The Challenger',
    palette: '01',
    dark: false,
    dataTheme: null,
    preview: ['#F5A623', '#111111', '#FDF6EC', '#FF3B3B'],
  },
  loudFan: {
    label: 'Loud Fan',
    palette: '02',
    dark: false,
    dataTheme: 'loud-fan',
    preview: ['#E85D04', '#0D0D0D', '#FFF4EE', '#FFD166'],
  },
  lateNight: {
    label: 'Late Night',
    palette: '03',
    dark: true,
    dataTheme: 'late-night',
    preview: ['#141414', '#1E1E1E', '#C9A84C', '#00A8FF'],
  },
  allAges: {
    label: 'All-Ages Party',
    palette: '04',
    dark: false,
    dataTheme: 'all-ages',
    preview: ['#1B4FD8', '#FFD23F', '#E63946', '#F8F9FF'],
  },
  counterintuitive: {
    label: 'Counterintuitive',
    palette: '05',
    dark: false,
    dataTheme: 'counterintuitive',
    preview: ['#000000', '#FFFFFF', '#3DAA51', '#FF2D78'],
  },
  boldOutsider: {
    label: 'Bold Outsider',
    palette: '06',
    dark: false,
    dataTheme: 'bold-outsider',
    preview: ['#D4F000', '#2D0A4E', '#FF4D4D', '#FAF7F0'],
  },
  neonNight: {
    label: 'Neon Night',
    palette: '07',
    dark: true,
    dataTheme: 'neon-night',
    preview: ['#0A0F2C', '#C8FF00', '#FF2D78', '#0F1535'],
  },
  underdog: {
    label: 'Underdog Story',
    palette: '08',
    dark: false,
    dataTheme: 'underdog',
    preview: ['#7C3AED', '#FCD34D', '#1A1A1A', '#FAF5FF'],
  },
  grassroots: {
    label: 'Grass Roots',
    palette: '09',
    dark: false,
    dataTheme: 'grassroots',
    preview: ['#166534', '#FEF9C3', '#DC2626', '#F0FDF4'],
  },
  sunrise: {
    label: 'Sunrise',
    palette: '10',
    dark: false,
    dataTheme: 'sunrise',
    preview: ['#FF6B35', '#FFBE0B', '#1C1C1C', '#FFF8F4'],
  },
}

export const DEFAULT_THEME = 'challenger'

// ENGINEER INSTRUCTIONS — Setting a theme for a Featured Public Match:
//
// 1. Go to Supabase Dashboard → Table Editor → rooms
// 2. Find the target room by name or id
// 3. Set `room_theme` to any key from the THEMES object
//    (e.g. 'neonNight', 'lateNight', 'sunrise')
// 4. Save. All players in that room will see the theme update
//    in real time on their next render or room re-subscribe.
// 5. To remove the override, set room_theme back to NULL.
//
// Alternatively, run this SQL in Supabase SQL Editor:
//   UPDATE rooms SET room_theme = 'neonNight' WHERE id = '<room-uuid>';
//   UPDATE rooms SET room_theme = NULL WHERE id = '<room-uuid>';

