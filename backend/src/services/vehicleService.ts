import { findAllVehicles } from '../database/repositories/vehicleRepository.js'
import type { Vehicle } from '../types/domain.js'

export function listVehicles(): Promise<Vehicle[]> {
  return findAllVehicles()
}
