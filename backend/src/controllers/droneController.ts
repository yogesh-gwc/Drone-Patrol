import type { Request, Response } from 'express'
import { getDrone, listDrones } from '../services/droneService.js'
import type { ApiResponse } from '../types/api.js'
import type { Drone } from '../types/domain.js'
import { sendCollection, sendItem } from '../utils/apiResponse.js'
import { parseIdentifierParam } from '../utils/validation.js'

export async function getDrones(
  _req: Request,
  res: Response<ApiResponse<Drone[]>>,
): Promise<void> {
  sendCollection(res, await listDrones(), 'drones')
}

export async function getDroneByIdentifier(
  req: Request,
  res: Response<ApiResponse<Drone>>,
): Promise<void> {
  const identifier = parseIdentifierParam(req.params.id, 'Drone id')
  sendItem(res, await getDrone(identifier), 'Drone')
}
