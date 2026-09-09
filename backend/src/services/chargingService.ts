import { findAllChargingStations } from '../database/repositories/chargingStationRepository.js'
import type { ChargingStation } from '../types/domain.js'

export function listChargingStations(): Promise<ChargingStation[]> {
  return findAllChargingStations()
}
