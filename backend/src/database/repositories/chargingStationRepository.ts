import { CHARGING_STATIONS } from '../../data/datasets.js'
import type { ChargingStation } from '../../types/domain.js'

export async function findAllChargingStations(): Promise<ChargingStation[]> {
  return [...CHARGING_STATIONS].sort((a, b) => a.stationCode.localeCompare(b.stationCode))
}

export async function findChargingStationById(id: number): Promise<ChargingStation | null> {
  return CHARGING_STATIONS.find((station) => station.id === id) ?? null
}
