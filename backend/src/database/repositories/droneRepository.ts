import { DRONES } from '../../data/datasets.js'
import type { Drone } from '../../types/domain.js'

/**
 * Drone configuration lookups.
 *
 * Backed by `backend/data/drones.json` rather than MySQL. Live position,
 * battery and mode come from the in-memory simulation engine, not from here.
 */
export async function findAllDrones(): Promise<Drone[]> {
  return [...DRONES].sort((a, b) => a.droneCode.localeCompare(b.droneCode))
}

export async function findDroneById(id: number): Promise<Drone | null> {
  return DRONES.find((drone) => drone.id === id) ?? null
}

export async function findDroneByCode(code: string): Promise<Drone | null> {
  return DRONES.find((drone) => drone.droneCode === code) ?? null
}
