import type { Request, Response } from 'express'
import { listRoutes } from '../services/routeService.js'
import type { ApiResponse } from '../types/api.js'
import type { DroneRoute } from '../types/domain.js'
import { sendCollection } from '../utils/apiResponse.js'

export async function getRoutes(
  _req: Request,
  res: Response<ApiResponse<DroneRoute[]>>,
): Promise<void> {
  sendCollection(res, await listRoutes(), 'routes')
}
