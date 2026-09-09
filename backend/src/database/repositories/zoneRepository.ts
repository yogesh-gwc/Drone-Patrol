import { ZONES } from '../../data/datasets.js'
import type { DroneZone } from '../../types/domain.js'

export async function findAllZones(): Promise<DroneZone[]> {
  return [...ZONES].sort((a, b) => a.zoneCode.localeCompare(b.zoneCode))
}

export async function findZoneById(id: number): Promise<DroneZone | null> {
  return ZONES.find((zone) => zone.id === id) ?? null
}
