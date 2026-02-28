import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
const env = import.meta.env.VITE_ENV || 'development'
const isProd = env === 'production'

const TOKEN_PATTERN = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

function scrubTokens(str) {
  if (typeof str !== 'string') return str
  return str.replace(TOKEN_PATTERN, '[REDACTED_TOKEN]')
}

function scrubObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const scrubbed = {}
  for (const [key, val] of Object.entries(obj)) {
    scrubbed[key] = typeof val === 'string' ? scrubTokens(val) : val
  }
  return scrubbed
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    enabled: !!dsn,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.headers) {
        event.request.headers = scrubObject(event.request.headers)
      }
      if (event.request?.query_string) {
        event.request.query_string = scrubTokens(event.request.query_string)
      }
      if (event.request?.url) {
        event.request.url = scrubTokens(event.request.url)
      }
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.data) crumb.data = scrubObject(crumb.data)
          if (crumb.message) crumb.message = scrubTokens(crumb.message)
        }
      }
      return event
    },
  })
}

export { Sentry }
