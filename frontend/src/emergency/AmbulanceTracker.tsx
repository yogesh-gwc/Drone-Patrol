import { useEffect, useRef } from 'react'
import { beginChase, chaseAt } from '../map/mapCamera'
import { getMapInstance } from '../map/mapRegistry'
import { useSimulationStore } from '../store/simulationStore'

/**
 * Ambulance follow toggle.
 *
 * When armed, the camera keeps the ambulance centred for as long as the run
 * lasts, so the operator can watch a priority corridor play out without
 * chasing it by hand. Stays armed until switched off or the run resolves.
 *
 * Following puts the camera into a chase pose - low over the carriageway,
 * looking along the direction of travel - rather than just recentring. A plain
 * recentre inherited the operator's current pitch, so following from the flat
 * overview gave a top-down chase with none of the 3D corridor visible.
 *
 * The swing into that pose is a flight, and a flight must not be interrupted:
 * snapshots arrive at 5 Hz and each one would restart it, leaving the camera
 * stuck part-way. So per-snapshot tracking is armed only once the flight has
 * settled, signalled by `moveend`.
 */
export function AmbulanceTracker() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const following = useSimulationStore((state) => state.followAmbulance)
  const setFollowing = useSimulationStore((state) => state.setFollowAmbulance)
  const selectDrone = useSimulationStore((state) => state.selectDrone)

  const active = snapshot?.ambulance.active ?? false
  const ambulance = snapshot?.vehicles.find((v) => v.code === snapshot.ambulance.vehicleCode)

  // True once the opening flight has settled and tracking may take over.
  const chaseReady = useRef(false)
  const position = ambulance?.position
  const heading = ambulance?.headingDegrees

  // Swing into the chase pose when following is armed, and disarm on release.
  useEffect(() => {
    const map = getMapInstance()
    if (!map) {
      return
    }
    if (!following) {
      chaseReady.current = false
      return
    }
    if (!position || heading === undefined) {
      return
    }
    const arm = () => {
      chaseReady.current = true
    }
    map.once('moveend', arm)
    beginChase(map, position, heading)
    return () => {
      map.off('moveend', arm)
    }
    // Intentionally keyed on `following` alone: this is the one-off entry
    // flight, not the per-snapshot tracking below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following])

  // Hold the chase. Bearing is low-pass filtered because lane changes and
  // corridor vertices jitter the raw heading, and a jittering bearing reads as
  // a camera that cannot make up its mind.
  const smoothedBearing = useRef(0)
  useEffect(() => {
    if (!following || !chaseReady.current || !position || heading === undefined) {
      return
    }
    const map = getMapInstance()
    if (!map) {
      return
    }
    // Blend along the shortest arc so 350 deg -> 10 deg does not spin the map.
    const delta = ((heading - smoothedBearing.current + 540) % 360) - 180
    smoothedBearing.current = (smoothedBearing.current + delta * 0.18 + 360) % 360
    chaseAt(map, position, smoothedBearing.current)
  }, [following, position?.[0], position?.[1], heading, position])

  // Drop the lock automatically once the run is over.
  useEffect(() => {
    if (!active && following) {
      setFollowing(false)
    }
  }, [active, following, setFollowing])

  if (!active) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => {
        const next = !following
        setFollowing(next)
        if (next && snapshot?.ambulance.assignedDroneCode) {
          selectDrone(snapshot.ambulance.assignedDroneCode)
        }
      }}
      title={
        following
          ? 'Stop following the ambulance'
          : 'Keep the camera locked on the ambulance until deselected'
      }
      className={`rounded-sm border px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] uppercase transition-colors ${
        following
          ? 'border-red-500 bg-red-600 text-white shadow-sm'
          : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300'
      }`}
    >
      {following ? 'Following ambulance' : 'Track ambulance'}
    </button>
  )
}
