import type { ActivityKind } from '../../types/simulation'

/**
 * Presentation helpers for the home dashboard.
 *
 * Formatting only. Every figure the dashboard shows comes from the simulation
 * snapshot (baseline in `backend/data/dashboard.json` plus live events), never
 * from constants in a component.
 */

/** Indian-format currency for the SIMULATED enforcement figures. */
export function rupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

/** "2m 18s" for an escort response time. */
export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const rem = seconds % 60
  return `${m}m ${String(rem).padStart(2, '0')}s`
}

/** "10:42" on the simulation clock. */
export function clockTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Accent colour per activity kind, in the light palette. */
export const ACTIVITY_TONE: Record<ActivityKind, string> = {
  AMBULANCE: 'bg-red-500',
  SOS: 'bg-rose-500',
  VIOLATION: 'bg-amber-500',
  SUSPICIOUS: 'bg-orange-500',
  POLICE: 'bg-indigo-500',
  CHARGING: 'bg-emerald-500',
}

export const CONGESTION_TONE: Record<string, string> = {
  LIGHT: 'text-emerald-600 dark:text-emerald-400',
  MODERATE: 'text-amber-600 dark:text-amber-400',
  HEAVY: 'text-red-600 dark:text-red-400',
}
