import type { Request, Response } from 'express'
import { listChargingStations } from '../services/chargingService.js'
import type { ApiResponse } from '../types/api.js'
import type { ChargingStation } from '../types/domain.js'
import { sendCollection } from '../utils/apiResponse.js'

export async function getChargingStations(
  _req: Request,
  res: Response<ApiResponse<ChargingStation[]>>,
): Promise<void> {
  sendCollection(res, await listChargingStations(), 'charging stations')
}
