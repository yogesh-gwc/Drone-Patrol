import { findAllRoutes } from '../database/repositories/routeRepository.js'
import type { DroneRoute } from '../types/domain.js'

export function listRoutes(): Promise<DroneRoute[]> {
  return findAllRoutes()
}
