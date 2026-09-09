import type { ApiResponse, HealthData } from '../types/api'
import { apiGet } from './apiClient'

/** Calls `GET /api/health` to verify backend connectivity. */
export function fetchHealth(signal?: AbortSignal): Promise<ApiResponse<HealthData>> {
  return apiGet<HealthData>('/api/health', signal)
}
