import type { Request, Response } from 'express'
import { getHealthSnapshot } from '../services/healthService.js'
import type { ApiResponse, HealthData } from '../types/api.js'

export function getHealth(_req: Request, res: Response<ApiResponse<HealthData>>): void {
  res.status(200).json({
    success: true,
    message: 'AEROGUARD 3D backend is running',
    data: getHealthSnapshot(),
  })
}
