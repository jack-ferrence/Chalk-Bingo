export default function CategoryTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="store-category-tabs" style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onTabChange(t.key)}
          style={{
            background: activeTab === t.key ? 'linear-gradient(135deg, #ff7a45 0%, #e05520 100%)' : 'rgba(255,255,255,0.04)',
            color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
            border: activeTab === t.key ? 'none' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            fontFamily: 'var(--db-font-ui)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '6px 14px',
            cursor: 'pointer',
            transition: 'all 120ms ease',
            boxShadow: activeTab === t.key ? '0 2px 10px rgba(255,107,53,0.3)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== t.key) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== t.key) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
            }
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
