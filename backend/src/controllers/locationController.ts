import type { Request, Response } from 'express'
import { listLocations } from '../services/locationService.js'
import type { ApiResponse } from '../types/api.js'
import type { MapLocation } from '../types/domain.js'
import { sendCollection } from '../utils/apiResponse.js'

export async function getLocations(
  _req: Request,
  res: Response<ApiResponse<MapLocation[]>>,
): Promise<void> {
  sendCollection(res, await listLocations(), 'locations')
}
