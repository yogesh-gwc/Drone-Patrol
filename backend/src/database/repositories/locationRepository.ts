import { LOCATIONS } from '../../data/datasets.js'
import type { MapLocation } from '../../types/domain.js'

export async function findAllLocations(): Promise<MapLocation[]> {
  return [...LOCATIONS].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
}

export async function findLocationById(id: number): Promise<MapLocation | null> {
  return LOCATIONS.find((location) => location.id === id) ?? null
}
