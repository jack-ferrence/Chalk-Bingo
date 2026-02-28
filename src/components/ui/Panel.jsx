function Panel({ title, className = '', children }) {
  return (
    <div
      className={`rounded-lg border border-border-subtle bg-bg-secondary p-4 card-bevel ${className}`}
    >
      {title && (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

export default Panel
