import { useSimulationStore } from '../store/simulationStore'
import { CameraFeedTile } from './CameraFeedTile'
import { cameraUnavailableReason, getCameraFeeds, missionLabel } from './cameraFeeds'

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-[9px] tracking-[0.14em] text-slate-500 uppercase">{label}</dt>
      <dd className={`font-mono text-[11px] ${tone ?? 'text-slate-800 dark:text-slate-200'}`}>
        {value}
      </dd>
    </div>
  )
}

/**
 * Drone Operations: the onboard view for one selected drone.
 *
 * Mounted only while a drone is selected, so the video elements exist for
 * exactly one drone at a time - selecting another unmounts these and mounts
 * fresh ones. That is what keeps the page from ever holding twenty decoding
 * streams open.
 */
export function DroneCameraPanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const droneCode = useSimulationStore((state) => state.selectedDroneCode)
  const selectDrone = useSimulationStore((state) => state.selectDrone)
  const followAmbulance = useSimulationStore((state) => state.followAmbulance)
  const setExpandedFeedDirection = useSimulationStore((state) => state.setExpandedFeedDirection)

  const drone = droneCode ? snapshot?.drones.find((d) => d.code === droneCode) : undefined
  if (!drone) {
    return null
  }

  const unavailable = cameraUnavailableReason(drone.mode)
  const ambulance = snapshot?.ambulance
  const escorting = drone.mode === 'ESCORTING' && ambulance?.active === true
  const sos = snapshot?.sos
  const onSos = drone.mode === 'SOS_TRACKING' && sos != null

  const speaker =
    unavailable !== null ? 'UNAVAILABLE' : drone.speakerStatus === 'ACTIVE' ? 'ACTIVE' : 'READY'

  const isEscortingDrone =
    (drone.mode === 'ESCORTING' || drone.code === ambulance?.assignedDroneCode) &&
    ambulance?.active === true

  const showAmbulanceFeeds = followAmbulance && isEscortingDrone
  const feeds = getCameraFeeds(showAmbulanceFeeds)

  return (
    <div className="pointer-events-auto w-full shrink-0 rounded-md border border-slate-300 bg-white/95 shadow-md backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold tracking-widest text-slate-900 dark:text-slate-100">
            {drone.code}
          </p>
          <span
            className={`text-[9px] tracking-[0.14em] uppercase ${
              unavailable
                ? 'text-slate-500'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {unavailable ? 'Cameras off' : 'Live'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => selectDrone(null)}
          aria-label="Close drone operations panel"
          className="rounded-sm border border-slate-300 px-1.5 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:hover:text-slate-100"
        >
          &times;
        </button>
      </header>

      {/* Two feeds side by side: front and rear. */}
      <div className="grid grid-cols-2 gap-1.5 p-1.5">
        {feeds.map((feed) => (
          <CameraFeedTile
            key={`${feed.direction}-${feed.src}`}
            feed={feed}
            unavailable={unavailable}
            onExpand={() => setExpandedFeedDirection(feed.direction)}
          />
        ))}
      </div>

      <dl className="border-t border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <Row label="Mission" value={missionLabel(drone.mode).toUpperCase()} />
        {escorting && ambulance && (
          <>
            <Row label="Lead" value={`${ambulance.droneLeadMeters} m ahead`} />
            <Row label="Destination" value={ambulance.destinationName} />
          </>
        )}
        {onSos && sos && <Row label="SOS" value={sos.id} />}
        <Row
          label="Speaker"
          value={speaker}
          tone={
            speaker === 'ACTIVE'
              ? 'text-red-600 dark:text-red-400'
              : speaker === 'UNAVAILABLE'
                ? 'text-slate-500'
                : 'text-emerald-600 dark:text-emerald-400'
          }
        />
        <Row label="Battery" value={`${drone.batteryPercentage.toFixed(0)}%`} />
        <Row label="Altitude" value={`${drone.altitudeMeters.toFixed(0)} m AGL`} />
        <Row label="Speed" value={`${(drone.speedKmh / 3.6).toFixed(0)} m/s`} />
        <Row label="Heading" value={`${drone.headingDegrees.toFixed(0)}°`} />
        <Row label="Latitude" value={drone.position[1].toFixed(5)} />
        <Row label="Longitude" value={drone.position[0].toFixed(5)} />
      </dl>

      <p className="border-t border-slate-200 px-3 py-1.5 text-[9px] leading-snug text-slate-500 dark:border-slate-800">
        Simulated camera footage. The 3D map is the source of truth for position and mission.
      </p>
    </div>
  )
}
