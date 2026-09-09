import { VEHICLES } from '../../data/datasets.js'
import type { Vehicle } from '../../types/domain.js'

/**
 * Vehicle configuration lookups.
 *
 * These are the catalogue rows. Live traffic is generated and moved by the
 * simulation engine and streamed over Socket.IO.
 */
export async function findAllVehicles(): Promise<Vehicle[]> {
  return [...VEHICLES].sort((a, b) => a.vehicleCode.localeCompare(b.vehicleCode))
}

export async function findVehicleById(id: number): Promise<Vehicle | null> {
  return VEHICLES.find((vehicle) => vehicle.id === id) ?? null
}

export async function findVehicleByCode(code: string): Promise<Vehicle | null> {
  return VEHICLES.find((vehicle) => vehicle.vehicleCode === code) ?? null
}
