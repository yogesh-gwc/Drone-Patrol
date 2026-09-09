import type { Request, Response } from 'express'
import { listZones } from '../services/zoneService.js'
import type { ApiResponse } from '../types/api.js'
import type { DroneZone } from '../types/domain.js'
import { sendCollection } from '../utils/apiResponse.js'

export async function getZones(
  _req: Request,
  res: Response<ApiResponse<DroneZone[]>>,
): Promise<void> {
  sendCollection(res, await listZones(), 'patrol zones')
}
