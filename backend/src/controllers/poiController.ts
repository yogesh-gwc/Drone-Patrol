import type { Request, Response } from 'express'
import { CORRIDOR_POIS } from '../simulation/pois.js'
import type { Poi } from '../simulation/pois.js'
import type { ApiResponse } from '../types/api.js'
import { sendCollection } from '../utils/apiResponse.js'

/**
 * Real facilities along the corridor.
 *
 * OpenStreetMap-derived, and kept separate from `/api/locations`, which serves
 * the SIMULATED placeholder rows inherited from Phase 2.
 */
export function getPois(_req: Request, res: Response<ApiResponse<Poi[]>>): void {
  sendCollection(res, CORRIDOR_POIS, 'corridor facilities')
}
