function requireEnv(name) {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Check your .env.development or .env.production file.`
    )
  }
  return value
}

export const config = Object.freeze({
  supabaseUrl: requireEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('VITE_SUPABASE_ANON_KEY'),
  env: import.meta.env.VITE_ENV || 'development',
  isDev: (import.meta.env.VITE_ENV || 'development') === 'development',
  isProd: import.meta.env.VITE_ENV === 'production',
})
