import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Opening balances for the command dashboard.
 *
 * SIMULATED DEMONSTRATION DATA, loaded from `backend/data/dashboard.json`.
 * These figures exist so the dashboard is populated on a cold start instead of
 * showing a wall of zeroes; they are invented, not real government statistics,
 * and no enforcement, medical or police system is involved.
 *
 * Configuration only: like every other file in `backend/data`, this is read at
 * startup and never written back. Live counts are added on top at runtime.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const file = JSON.parse(
  readFileSync(path.resolve(here, '../../data/dashboard.json'), 'utf8'),
) as DashboardBaselineFile

export interface SeedActivity {
  minutesAgo: number
  kind: string
  title: string
  detail: string
}

interface DashboardBaselineFile {
  simulated: boolean
  baselineLabel: string
  emergency: {
    ambulancesEscorted: number
    completedTrips: number
    activeEscorts: number
    sosResponses: number
    averageEscortResponseSeconds: number
  }
  traffic: {
    vehiclesMonitored: number
    speedViolations: number
    simulatedFines: number
    longStoppedVehicles: number
    speedLimitKmh: number
    fineAmount: number
  }
  publicSafety: {
    sosRequests: number
    resolvedSos: number
    suspiciousVehicles: number
    activeInvestigations: number
    policeDispatches: number
  }
  droneOperations: { totalFlightHours: number; sortiesFlown: number }
  seedActivity: SeedActivity[]
  seedEscorts: { code: string; route: string; status: string; responseSeconds: number }[]
  seedSosEvents: { code: string; location: string; status: string }[]
  seedViolations: { code: string; speedKmh: number; location: string; fine: number }[]
  seedSuspicious: {
    code: string
    stoppedMinutes: number
    location: string
    reason: string
    status: string
  }[]
}

export const DASHBOARD_BASELINE = file
