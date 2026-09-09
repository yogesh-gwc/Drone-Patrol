import { INCIDENTS } from '../../data/datasets.js'
import type { Incident } from '../../types/domain.js'

export async function findAllIncidents(): Promise<Incident[]> {
  return [...INCIDENTS].sort((a, b) => b.id - a.id)
}

export async function findIncidentById(id: number): Promise<Incident | null> {
  return INCIDENTS.find((incident) => incident.id === id) ?? null
}
