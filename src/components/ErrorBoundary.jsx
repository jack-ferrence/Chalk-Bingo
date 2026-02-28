import { Sentry } from '../lib/sentry.js'

function FallbackUI() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg-primary px-4 text-center">
      <div className="rounded-xl border border-accent-red/30 bg-accent-red/5 p-8">
        <h1 className="text-lg font-semibold text-text-primary">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          An unexpected error occurred. Refresh to rejoin your game.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-accent-green px-4 py-2 text-sm font-semibold text-bg-primary shadow-sm hover:bg-accent-green/80"
        >
          Refresh Page
        </button>
      </div>
    </div>
  )
}

function ErrorBoundary({ children }) {
  if (Sentry.ErrorBoundary) {
    return (
      <Sentry.ErrorBoundary fallback={<FallbackUI />}>
        {children}
      </Sentry.ErrorBoundary>
    )
  }

  return children
}

export default ErrorBoundary
