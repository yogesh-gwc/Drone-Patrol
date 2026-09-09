import { useEffect, useState } from 'react'
import { postSimulationCommand } from '../services/simulationSocket'
import { useSimulationStore } from '../store/simulationStore'

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <dt className="text-[10px] tracking-wider text-slate-500 uppercase">{label}</dt>
      <dd className={`font-mono text-[11px] ${tone ?? 'text-slate-800 dark:text-slate-200'}`}>
        {value}
      </dd>
    </div>
  )
}

function batteryTone(level: number): string {
  if (level <= 25) return 'text-red-600 dark:text-red-400'
  if (level <= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

const MODE_TONE: Record<string, string> = {
  PATROLLING: 'text-emerald-600 dark:text-emerald-400',
  CHARGING: 'text-amber-600 dark:text-amber-400',
  ESCORTING: 'text-red-600 dark:text-red-400',
  RETURNING: 'text-sky-600 dark:text-sky-400',
  OFFLINE: 'text-slate-500',
}

/**
 * Detail for whichever drone, vehicle or charging station is selected.
 *
 * Collapsed by default to a single summary line - identity, status and
 * battery - because the full telemetry list is tall enough to cover a useful
 * part of the corridor, and most of the time the operator only wants to know
 * which unit they just clicked and whether it is healthy. The dropdown opens
 * the depth: altitude, heading, position, camera, speaker and GPS.
 */
export function SelectionPanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const droneCode = useSimulationStore((state) => state.selectedDroneCode)
  const stationCode = useSimulationStore((state) => state.selectedStationCode)
  const vehicleCode = useSimulationStore((state) => state.selectedVehicleCode)
  const selectDrone = useSimulationStore((state) => state.selectDrone)
  const selectStation = useSimulationStore((state) => state.selectStation)
  const selectVehicle = useSimulationStore((state) => state.selectVehicle)

  // Collapse again whenever the selection changes, so opening one unit's
  // detail does not leave every later selection expanded.
  const [expanded, setExpanded] = useState(false)
  const selectionKey = droneCode ?? stationCode ?? vehicleCode ?? null
  useEffect(() => {
    setExpanded(false)
  }, [selectionKey])

  const drone = droneCode ? snapshot?.drones.find((d) => d.code === droneCode) : undefined
  const station = stationCode ? snapshot?.stations.find((s) => s.code === stationCode) : undefined
  const vehicle = vehicleCode ? snapshot?.vehicles.find((v) => v.code === vehicleCode) : undefined

  if (!drone && !station && !vehicle) {
    return null
  }

  // One status word per selection type, so the collapsed line reads the same
  // whichever kind of object is selected.
  let summaryStatus = ''
  let summaryTone = 'text-slate-700 dark:text-slate-300'
  let summaryBattery: number | null = null

  if (drone) {
    summaryStatus = drone.mode.replace('_', ' ')
    summaryTone = MODE_TONE[drone.mode] ?? summaryTone
    summaryBattery = drone.batteryPercentage
  } else if (vehicle) {
    if (vehicle.stopped) {
      summaryStatus = 'STOPPED'
      summaryTone = 'text-amber-600 dark:text-amber-400'
    } else if (vehicle.yielding) {
      summaryStatus = 'YIELDING'
      summaryTone = 'text-red-600 dark:text-red-400'
    } else if (vehicle.speedKmh < 30) {
      summaryStatus = 'CONGESTED'
      summaryTone = 'text-amber-600 dark:text-amber-400'
    } else {
      summaryStatus = 'MOVING'
      summaryTone = 'text-emerald-600 dark:text-emerald-400'
    }
  } else if (station) {
    const full = station.occupiedSlots >= station.capacity
    summaryStatus = full ? 'PADS FULL' : `${station.capacity - station.occupiedSlots} PAD FREE`
    summaryTone = full
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400'
  }

  const close = () => {
    selectDrone(null)
    selectStation(null)
    selectVehicle(null)
  }

  return (
    <div className="pointer-events-auto w-full shrink-0 rounded-md border border-slate-300 bg-white/95 shadow-md backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/85">
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold tracking-widest text-slate-900 dark:text-slate-100">
            {drone?.code ?? station?.code ?? vehicle?.code}
          </p>
          <p className="text-[10px] tracking-wider text-slate-500 uppercase">
            {drone ? drone.name : station ? station.name : `${vehicle?.kind} on NH-44`}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close detail panel"
          className="rounded-sm border border-slate-300 px-1.5 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:hover:text-slate-100"
        >
          &times;
        </button>
      </header>

      {/* Always-visible summary: what it is, what it is doing, how much power. */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className={`text-[11px] font-medium tracking-wide ${summaryTone}`}>
          {summaryStatus}
        </span>
        {summaryBattery !== null && (
          <span className={`font-mono text-[11px] ${batteryTone(summaryBattery)}`}>
            {summaryBattery.toFixed(0)}%
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between border-t border-slate-200 px-3 py-1.5 text-[9px] tracking-[0.16em] text-slate-500 uppercase transition-colors hover:text-slate-800 dark:border-slate-800 dark:hover:text-slate-200"
      >
        {expanded ? 'Hide detail' : 'Full detail'}
        <span aria-hidden className={expanded ? 'rotate-180' : ''}>
          &#9662;
        </span>
      </button>

      <dl className={expanded ? 'px-3 py-1.5' : 'hidden'}>
        {drone && (
          <>
            <Row label="Status" value={drone.mode} tone={MODE_TONE[drone.mode]} />
            <Row label="Battery" value={`${drone.batteryPercentage.toFixed(0)}%`} />
            <Row label="Route" value="NH-44" />
            <Row label="Zone" value={drone.zoneCode} />
            <Row label="Altitude" value={`${drone.altitudeMeters.toFixed(0)} m AGL`} />
            <Row label="Speed" value={`${drone.speedKmh.toFixed(0)} km/h`} />
            <Row label="Heading" value={`${drone.headingDegrees.toFixed(0)}°`} />
            <Row label="Longitude" value={drone.position[0].toFixed(5)} />
            <Row label="Latitude" value={drone.position[1].toFixed(5)} />
            <Row
              label="Camera"
              value={drone.cameraStatus}
              tone={
                drone.cameraStatus === 'LIVE'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }
            />
            <Row label="Speaker" value={drone.speakerStatus} />
            <Row label="GPS" value={drone.gpsStatus} />
            {drone.stationCode && <Row label="Pad" value={drone.stationCode} />}
          </>
        )}

        {vehicle && (
          <>
            <Row label="Type" value={vehicle.kind} />
            <Row
              label="Status"
              value={vehicle.yielding ? 'YIELDING' : vehicle.speedKmh < 30 ? 'CONGESTED' : 'MOVING'}
              tone={
                vehicle.yielding
                  ? 'text-red-600 dark:text-red-400'
                  : vehicle.speedKmh < 30
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              }
            />
            <Row label="Speed" value={`${vehicle.speedKmh.toFixed(0)} km/h`} />
            <Row label="Route" value="NH-44" />
            <Row
              label="Direction"
              value={vehicle.direction === 1 ? 'To Hosur' : 'To Krishnagiri'}
            />
            <Row label="Chainage" value={`${(vehicle.distanceAlongMeters / 1000).toFixed(2)} km`} />
            {vehicle.stopped && (
              <Row
                label="Stopped for"
                value={`${vehicle.stoppedMinutes.toFixed(0)} min (sim)`}
                tone="text-amber-600 dark:text-amber-400"
              />
            )}
            <Row label="Longitude" value={vehicle.position[0].toFixed(5)} />
            <Row label="Latitude" value={vehicle.position[1].toFixed(5)} />
          </>
        )}

        {station && (
          <>
            <Row
              label="Slots"
              value={`${station.occupiedSlots} / ${station.capacity}`}
              tone={
                station.occupiedSlots >= station.capacity
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
            />
            <Row label="Longitude" value={station.position[0].toFixed(5)} />
            <Row label="Latitude" value={station.position[1].toFixed(5)} />
            <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800">
              {station.dockedDroneCodes.length === 0 ? (
                <p className="py-0.5 text-[11px] text-slate-500">No drones docked</p>
              ) : (
                station.dockedDroneCodes.map((code) => (
                  <Row
                    key={code}
                    label={code}
                    value="CHARGING"
                    tone="text-amber-600 dark:text-amber-400"
                  />
                ))
              )}
            </div>
          </>
        )}
      </dl>

      {expanded && vehicle && vehicle.kind !== 'AMBULANCE' && (
        <div className="flex gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
          <button
            type="button"
            disabled={vehicle.stopped}
            onClick={() => void postSimulationCommand(`/api/vehicles/${vehicle.code}/stop`)}
            title="Park this vehicle on the NH-44 shoulder and start its stationary timer"
            className="flex-1 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-medium tracking-wide text-amber-700 uppercase hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300"
          >
            Stop vehicle
          </button>
          <button
            type="button"
            disabled={!vehicle.stopped}
            onClick={() => void postSimulationCommand(`/api/vehicles/${vehicle.code}/start`)}
            className="flex-1 rounded-sm border border-slate-300 px-2 py-1 text-[10px] tracking-wide text-slate-600 uppercase hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400"
          >
            Start vehicle
          </button>
        </div>
      )}

      {expanded && (
        <p className="border-t border-slate-200 px-3 py-1.5 text-[9px] leading-snug text-slate-500 dark:border-slate-800">
          Simulated telemetry. Not physical hardware.
        </p>
      )}
    </div>
  )
}
