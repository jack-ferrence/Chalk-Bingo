import { THEMES } from '../lib/themes'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemePicker({ onClose }) {
  const { activeTheme, setTheme } = useTheme()
  const entries = Object.entries(THEMES)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--cb-gray-200)] bg-[var(--cb-sand)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--cb-secondary)]">
            Choose Theme
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--cb-gray-400)] hover:text-[var(--cb-secondary)] transition text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {entries.map(([key, theme]) => {
            const isActive = key === activeTheme
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setTheme(key); onClose() }}
                className={`
                  group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition
                  ${isActive
                    ? 'border-[var(--cb-primary)] ring-2 ring-[var(--cb-primary)]/30 bg-[var(--cb-white)]'
                    : 'border-[var(--cb-gray-200)] bg-[var(--cb-white)] hover:border-[var(--cb-gray-300)]'}
                `}
              >
                <div className="flex gap-1">
                  {theme.preview.map((color, i) => (
                    <span
                      key={i}
                      className="block h-5 w-5 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-[var(--cb-secondary)]">
                  {theme.label}
                </span>
                {isActive && (
                  <span className="absolute right-2 top-2 text-[10px] font-bold uppercase tracking-wider text-[var(--cb-primary)]">
                    Active
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
