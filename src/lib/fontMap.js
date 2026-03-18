export const FONT_MAP = {
  default: "'JetBrains Mono', monospace",
  mono:    "'JetBrains Mono', monospace",
  display: "'Bebas Neue', Impact, sans-serif",
  serif:   "Georgia, 'Times New Roman', serif",
  rounded: "'Nunito', 'Varela Round', sans-serif",
}

export function getFontFamily(fontKey) {
  return FONT_MAP[fontKey] || FONT_MAP.default
}

// Badge metadata keyed by item_id — avoids extra DB queries in Leaderboard/Chat
export const BADGE_MAP = {
  badge_flame:     { emoji: '🔥', label: 'ON FIRE' },
  badge_crown:     { emoji: '👑', label: 'CHAMP' },
  badge_lightning: { emoji: '⚡', label: 'FAST' },
  badge_diamond:   { emoji: '💎', label: 'DIAMOND' },
  badge_ghost:     { emoji: '👻', label: 'GHOST' },
  badge_rocket:    { emoji: '🚀', label: 'LAUNCH' },
  badge_skull:     { emoji: '💀', label: 'SKULL' },
  badge_star:      { emoji: '⭐', label: 'ALL-STAR' },
  // Legacy badge IDs from v1
  badge_fire:  { emoji: '🔥', label: 'ON FIRE' },
  badge_goat:  { emoji: '🐐', label: 'GOAT' },
  badge_zap:   { emoji: '⚡', label: 'ZAP' },
  badge_gem:   { emoji: '💎', label: 'GEM' },
}

export function getBadge(itemId) {
  return BADGE_MAP[itemId] ?? null
}
