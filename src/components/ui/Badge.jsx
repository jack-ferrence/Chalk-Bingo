const VARIANTS = {
  success:
    'bg-accent-green/15 text-accent-green ring-1 ring-accent-green/30',
  warning:
    'bg-accent-gold/15 text-accent-gold ring-1 ring-accent-gold/30',
  danger:
    'bg-accent-red/15 text-accent-red ring-1 ring-accent-red/30',
  muted:
    'bg-bg-hover text-text-muted ring-1 ring-border-subtle',
}

function Badge({ variant = 'muted', pulse = false, pop = false, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${VARIANTS[variant] ?? VARIANTS.muted} ${pop ? 'badge-pop' : ''} ${className}`}
    >
      {pulse && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}

export default Badge
