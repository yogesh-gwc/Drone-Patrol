import { ROAD_SEGMENTS } from '../../data/datasets.js'
import type { RoadSegment } from '../../types/domain.js'

export async function findAllRoadSegments(): Promise<RoadSegment[]> {
  return [...ROAD_SEGMENTS].sort((a, b) => a.id - b.id)
}

export async function findRoadSegmentById(id: number): Promise<RoadSegment | null> {
  return ROAD_SEGMENTS.find((segment) => segment.id === id) ?? null
}
