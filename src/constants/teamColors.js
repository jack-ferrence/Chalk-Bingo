/**
 * NBA team primary brand colors keyed by abbreviation.
 * Used by GameCard for top-border accent and hover glow.
 */
export const NBA_TEAM_COLORS = {
  ATL: '#E03A3E', // Hawks
  BOS: '#007A33', // Celtics
  BKN: '#AAAAAA', // Nets (white on dark bg → light gray)
  CHA: '#1D1160', // Hornets
  CHI: '#CE1141', // Bulls
  CLE: '#860038', // Cavaliers
  DAL: '#00538C', // Mavericks
  DEN: '#FEC524', // Nuggets gold
  DET: '#C8102E', // Pistons
  GSW: '#1D428A', // Warriors
  HOU: '#CE1141', // Rockets
  IND: '#FDBB30', // Pacers gold
  LAC: '#C8102E', // Clippers
  LAL: '#552583', // Lakers
  MEM: '#5D76A9', // Grizzlies
  MIA: '#98002E', // Heat
  MIL: '#00471B', // Bucks
  MIN: '#0C2340', // Timberwolves
  NOP: '#0C2340', // Pelicans
  NYK: '#F58426', // Knicks
  OKC: '#007AC1', // Thunder
  ORL: '#0077C0', // Magic
  PHI: '#006BB6', // 76ers
  PHX: '#E56020', // Suns orange
  POR: '#E03A3E', // Trail Blazers
  SAC: '#5A2D81', // Kings
  SAS: '#C4CED4', // Spurs
  TOR: '#CE1141', // Raptors
  UTA: '#002B5C', // Jazz
  WAS: '#002B5C', // Wizards
  DEFAULT: '#475569',
}

/**
 * Convert a hex color to rgba string.
 * Used to build semi-transparent glow values.
 */
export function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
