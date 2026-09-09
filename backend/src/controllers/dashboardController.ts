import type { Request, Response } from 'express'
import { simulation } from '../simulation/simulationEngine.js'
import type { DashboardState } from '../simulation/types.js'
import type { ApiResponse } from '../types/api.js'
import { sendItem } from '../utils/apiResponse.js'

/**
 * Command dashboard figures.
 *
 * The same object the Socket.IO snapshot carries, exposed over REST so the
 * dashboard has a source to read on first paint before the socket delivers a
 * frame. SIMULATED DEMONSTRATION DATA: seeded opening balances from
 * `backend/data/dashboard.json` plus events this simulation produced. These
 * are not real government statistics, enforcement records or emergency-service
 * activity.
 */
export function getDashboard(_req: Request, res: Response<ApiResponse<DashboardState>>): void {
  sendItem(res, simulation.snapshot().dashboard, 'dashboard summary')
}
