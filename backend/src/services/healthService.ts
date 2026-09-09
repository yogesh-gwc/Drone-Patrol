import type { HealthData } from '../types/api.js'
import { env } from '../utils/env.js'

/** Builds the runtime snapshot reported by `GET /api/health`. */
export function getHealthSnapshot(): HealthData {
  return {
    service: 'aeroguard-3d-backend',
    environment: env.nodeEnv,
    uptimeSeconds: Number(process.uptime().toFixed(1)),
    timestamp: new Date().toISOString(),
  }
}
