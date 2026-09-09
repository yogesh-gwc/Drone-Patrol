import type { Request, Response } from 'express'
import type { ApiResponse } from '../types/api.js'

export function notFoundHandler(req: Request, res: Response<ApiResponse>): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}
