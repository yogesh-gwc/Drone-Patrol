import type { Request, Response } from 'express'
import { listVehicles } from '../services/vehicleService.js'
import type { ApiResponse } from '../types/api.js'
import type { Vehicle } from '../types/domain.js'
import { sendCollection } from '../utils/apiResponse.js'

export async function getVehicles(
  _req: Request,
  res: Response<ApiResponse<Vehicle[]>>,
): Promise<void> {
  sendCollection(res, await listVehicles(), 'vehicles')
}
