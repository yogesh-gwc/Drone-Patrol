/**
 * Shared shape of every AEROGUARD 3D REST response.
 * Mirrors `backend/src/types/api.ts`.
 */
export interface ApiResponse<T = undefined> {
  success: boolean
  message: string
  data?: T
}

/** Payload returned by `GET /api/health`. */
export interface HealthData {
  service: string
  environment: string
  uptimeSeconds: number
  timestamp: string
}
