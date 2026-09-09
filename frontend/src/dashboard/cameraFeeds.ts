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
 * TO ADD OR REPLACE CLIPS: drop them in `frontend/public/` and update
 * the paths below.
 */

export type CameraDirection = 'FRONT' | 'REAR'

export interface CameraFeed {
  direction: CameraDirection
  label: string
  src: string
  /**
   * Seconds into the clip this pane starts at.
   */
  startSeconds: number
}

const FRONT_CLIP = '/drone_front.mp4'
const REAR_CLIP = '/drone_rear.mp4'
const AMBULANCE_FRONT_CLIP = '/front_view.mp4'
const AMBULANCE_REAR_CLIP = '/rear_view.mp4'

export function getCameraFeeds(isTrackingAmbulance: boolean): CameraFeed[] {
  if (isTrackingAmbulance) {
    return [
      { direction: 'FRONT', label: 'Front camera (Ambulance)', src: AMBULANCE_FRONT_CLIP, startSeconds: 0 },
      { direction: 'REAR', label: 'Rear camera (Ambulance)', src: AMBULANCE_REAR_CLIP, startSeconds: 0 },
    ]
  }
  return [
    { direction: 'FRONT', label: 'Front camera', src: FRONT_CLIP, startSeconds: 0 },
    { direction: 'REAR', label: 'Rear camera', src: REAR_CLIP, startSeconds: 0 },
  ]
}

export const CAMERA_FEEDS: CameraFeed[] = getCameraFeeds(false)

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
