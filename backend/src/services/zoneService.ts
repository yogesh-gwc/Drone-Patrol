import { findAllZones } from '../database/repositories/zoneRepository.js'
import type { DroneZone } from '../types/domain.js'

export function listZones(): Promise<DroneZone[]> {
  return findAllZones()
}
