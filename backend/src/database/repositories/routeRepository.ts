import { ROUTES } from '../../data/datasets.js'
import type { DroneRoute } from '../../types/domain.js'

export async function findAllRoutes(): Promise<DroneRoute[]> {
  return [...ROUTES].sort((a, b) => a.id - b.id)
}

export async function findRouteById(id: number): Promise<DroneRoute | null> {
  return ROUTES.find((route) => route.id === id) ?? null
}
