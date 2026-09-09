import type { DroneMode } from '../types/simulation'

/**
 * Onboard camera feeds.
 *
 * The feeds are SIMULATED footage, not a render of the Three.js scene. The 3D
 * map remains the source of truth for where every drone, vehicle and incident
 * actually is; these clips only stand in for the operator's view down the
 * camera. The perspective belongs to the drone TYPE, so all ten drones share
 * the same two files rather than shipping twenty clips.
 *
 * TO ADD A REAL REAR CLIP: drop it in `frontend/public/` and change the `src`
 * on the REAR entry below. Nothing else needs to change. Until then both
 * feeds play the same file, offset in time so the two panes never show an
 * identical frame and cannot be mistaken for one duplicated view.
 */

export type CameraDirection = 'FRONT' | 'REAR'

export interface CameraFeed {
  direction: CameraDirection
  label: string
  src: string
  /**
   * Seconds into the clip this pane starts at.
   *
   * The rear pane is deliberately offset. If a dedicated rear clip is added
   * later, set this back to 0.
   */
  startSeconds: number
}

const SHARED_CLIP = '/i_need_sec_video.mp4'

export const CAMERA_FEEDS: CameraFeed[] = [
  { direction: 'FRONT', label: 'Front camera', src: SHARED_CLIP, startSeconds: 0 },
  { direction: 'REAR', label: 'Rear camera', src: SHARED_CLIP, startSeconds: 6 },
]

/**
 * Why a drone's cameras are unavailable, or null when they are live.
 *
 * Docked drones have their cameras powered down, and an offline drone reports
 * nothing at all. Every operational mode - patrol, escort, SOS response and
 * incident investigation - carries a live feed.
 */
export function cameraUnavailableReason(mode: DroneMode): string | null {
  if (mode === 'CHARGING') return 'Drone charging'
  if (mode === 'OFFLINE') return 'Drone offline'
  return null
}

/** Operator-facing name for what the drone is currently doing. */
export function missionLabel(mode: DroneMode): string {
  switch (mode) {
    case 'ESCORTING':
      return 'Ambulance escort'
    case 'SOS_TRACKING':
      return 'SOS response'
    case 'MONITORING':
      return 'Incident investigation'
    case 'CHARGING':
      return 'Charging'
    case 'RETURNING':
      return 'Returning to patrol'
    case 'OFFLINE':
      return 'Offline'
    default:
      return 'Patrolling'
  }
}
