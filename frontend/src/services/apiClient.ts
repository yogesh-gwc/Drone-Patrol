import type { ApiResponse } from '../types/api'
import { env } from '../utils/env'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Minimal typed GET helper for the AEROGUARD 3D REST API.
 *
 * Kept deliberately small: the backend owns all business logic, the frontend
 * only transports and renders it.
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  let body: ApiResponse<T> | null = null
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    body = null
  }

  if (!response.ok) {
    throw new ApiError(body?.message ?? `Request failed with status ${response.status}`, response.status)
  }

  if (!body) {
    throw new ApiError('Backend returned a malformed response', response.status)
  }

  return body
}
