const DEFAULT_BACKEND_URL = 'http://localhost:4000'

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

const apiUrl = stripTrailingSlash(import.meta.env.VITE_API_URL ?? DEFAULT_BACKEND_URL)

/**
 * Frontend runtime configuration.
 *
 * Only `VITE_*` variables are exposed to the browser by Vite. Never place
 * database credentials or other secrets here.
 */
export const env = {
  apiUrl,
  socketUrl: stripTrailingSlash(import.meta.env.VITE_SOCKET_URL ?? apiUrl),
} as const
