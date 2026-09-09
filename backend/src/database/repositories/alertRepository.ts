import { ALERTS } from '../../data/datasets.js'
import type { Alert } from '../../types/domain.js'

export async function findAllAlerts(): Promise<Alert[]> {
  return [...ALERTS].sort((a, b) => b.id - a.id)
}

export async function findAlertById(id: number): Promise<Alert | null> {
  return ALERTS.find((alert) => alert.id === id) ?? null
}
