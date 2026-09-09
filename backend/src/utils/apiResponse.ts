import type { Response } from 'express'
import type { ApiResponse } from '../types/api.js'

/**
 * Sends a collection with a 200 and a message that distinguishes an empty
 * result from a populated one. An empty collection is a success, not a 404.
 */
export function sendCollection<T>(
  res: Response<ApiResponse<T[]>>,
  items: T[],
  label: string,
): void {
  res.status(200).json({
    success: true,
    message: items.length === 0 ? `No ${label} found` : `${items.length} ${label} returned`,
    data: items,
  })
}

/** Sends a single resource with a 200. Missing resources throw NotFoundError instead. */
export function sendItem<T>(res: Response<ApiResponse<T>>, item: T, label: string): void {
  res.status(200).json({
    success: true,
    message: `${label} returned`,
    data: item,
  })
}
