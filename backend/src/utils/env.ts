import 'dotenv/config'

function readString(key: string, fallback: string): string {
  const value = process.env[key]
  return value === undefined || value.trim() === '' ? fallback : value.trim()
}

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key]
  if (raw === undefined || raw.trim() === '') {
    return fallback
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, received "${raw}"`)
  }
  return parsed
}

/**
 * Central, validated view of the backend environment.
 *
 * The prototype has no database: application data is static JSON in
 * `backend/data/` and all moving state is in memory, so nothing here is a
 * secret. Nothing else in the codebase should read `process.env` directly.
 */
export const env = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port: readNumber('PORT', 4000),
  clientUrl: readString('CLIENT_URL', 'http://localhost:5173'),


} as const

export const isProduction = env.nodeEnv === 'production'
