import { findAllLocations } from '../database/repositories/locationRepository.js'
import type { MapLocation } from '../types/domain.js'

export function listLocations(): Promise<MapLocation[]> {
  return findAllLocations()
}
