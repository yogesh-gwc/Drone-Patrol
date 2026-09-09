import type { NextFunction, Request, Response } from 'express'
import type { ApiResponse } from '../types/api.js'
import { isProduction } from '../utils/env.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

/**
 * Terminal Express error handler.
 *
 * AppError subclasses carry their own status and say whether the message is
 * safe to return. Anything else is treated as an unexpected 500: the detail is
 * logged server-side, and outside development the client only sees a generic
 * message, so stack traces, SQL and connection detail never leak.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  const where = `${req.method} ${req.originalUrl}`

  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error(`${where} failed`, error.cause ?? error.message)
    }
    res.status(error.status).json({
      success: false,
      message: error.expose || !isProduction ? error.message : 'Internal server error',
    })
    return
  }

  const message = error instanceof Error ? error.message : 'Unknown error'
  logger.error(`Unhandled error on ${where}`, message)

  res.status(500).json({
    success: false,
    message: isProduction ? 'Internal server error' : message,
  })
}
