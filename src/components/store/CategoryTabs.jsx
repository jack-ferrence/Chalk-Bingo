import { useLayoutEffect, useRef, useState } from 'react'

export default function CategoryTabs({ tabs, activeTab, onTabChange }) {
  const containerRef = useRef(null)
  const buttonRefs = useRef({})
  const [slider, setSlider] = useState({ left: 0, width: 0, height: 0, top: 0, opacity: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    const activeBtn = buttonRefs.current[activeTab]
    if (!container || !activeBtn) return

    const cr = container.getBoundingClientRect()
    const br = activeBtn.getBoundingClientRect()

    setSlider({
      left: br.left - cr.left,
      top: br.top - cr.top,
      width: br.width,
      height: br.height,
      opacity: 1,
    })
  }, [activeTab, tabs])

  return (
    <div
      ref={containerRef}
      className="store-category-tabs"
      style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', position: 'relative' }}
    >
      {/* Sliding pill background */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: slider.left,
          top: slider.top,
          width: slider.width,
          height: slider.height,
          opacity: slider.opacity,
          background: 'linear-gradient(135deg, #ff7a45 0%, #e05520 100%)',
          borderRadius: 6,
          boxShadow: '0 2px 10px rgba(255,107,53,0.3)',
          transition: 'left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {tabs.map((t) => (
        <button
          key={t.key}
          ref={(el) => { buttonRefs.current[t.key] = el }}
          type="button"
          onClick={() => onTabChange(t.key)}
          style={{
            background: 'transparent',
            color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
            border: activeTab === t.key ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            fontFamily: 'var(--db-font-ui)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'color 120ms ease',
            position: 'relative',
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            if (activeTab !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
          }}
          onMouseLeave={(e) => {
            if (activeTab !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
