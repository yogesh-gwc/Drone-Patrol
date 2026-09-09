import { ValidationError } from './errors.js'

const MAX_ID = 4_294_967_295
const CODE_PATTERN = /^[A-Z]{2,4}-\d{1,4}$/

/** Parses a positive integer route parameter such as `/api/zones/7`. */
export function parseIdParam(raw: unknown, label: string): number {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ValidationError(`${label} is required`)
  }
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(`${label} must be a positive integer, received "${raw}"`)
  }
  const value = Number(raw)
  if (value < 1 || value > MAX_ID) {
    throw new ValidationError(`${label} is out of range`)
  }
  return value
}

export type Identifier = { kind: 'id'; id: number } | { kind: 'code'; code: string }

/**
 * Accepts either a numeric primary key or an entity code such as `DR-01`.
 *
 * Anything else is rejected before it reaches the database, and both branches
 * are still bound as query parameters rather than interpolated.
 */
export function parseIdentifierParam(raw: unknown, label: string): Identifier {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ValidationError(`${label} is required`)
  }

  const value = raw.trim()
  if (/^\d+$/.test(value)) {
    return { kind: 'id', id: parseIdParam(value, label) }
  }

  const code = value.toUpperCase()
  if (!CODE_PATTERN.test(code)) {
    throw new ValidationError(
      `${label} must be a positive integer or a code such as DR-01, received "${raw}"`,
    )
  }
  return { kind: 'code', code }
}
