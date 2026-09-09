import { useSimulationStore } from '../store/simulationStore'

/**
 * Ambulance priority corridor banner.
 *
 * Shown only while the simulated emergency is active. Everything here is
 * simulated; no emergency service is contacted.
 */
export function AmbulancePanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const ambulance = snapshot?.ambulance

  if (!ambulance?.active) {
    return null
  }

  const vehicle = snapshot?.vehicles.find((v) => v.code === ambulance.vehicleCode)
  const drone = snapshot?.drones.find((d) => d.code === ambulance.assignedDroneCode)

  const arrived = ambulance.stage === 'ARRIVED' || ambulance.stage === 'COMPLETED'
  const heading =
    ambulance.stage === 'ARRIVED'
      ? 'Ambulance arrived'
      : ambulance.stage === 'COMPLETED'
        ? 'Emergency completed'
        : ambulance.stage === 'DISPATCHED'
          ? 'Drone dispatched (intercepting)'
          : 'Ambulance priority active'
  const eta =
    ambulance.etaSeconds === null
      ? '-'
      : ambulance.etaSeconds < 60
        ? `${ambulance.etaSeconds}s`
        : `${Math.floor(ambulance.etaSeconds / 60)}m ${ambulance.etaSeconds % 60}s`

  return (
    <div
      className={`pointer-events-auto w-full shrink-0 rounded-md border bg-white/95 shadow-md backdrop-blur dark:bg-slate-950/90 ${
        arrived
          ? 'border-emerald-300 dark:border-emerald-900/60'
          : ambulance.stage === 'DISPATCHED'
            ? 'border-amber-300 dark:border-amber-900/60'
            : 'border-red-300 dark:border-red-900/60'
      }`}
    >
      <header className="flex items-center justify-between border-b border-red-200 px-3 py-2 dark:border-red-900/50">
        <p
          className={`text-[11px] font-semibold tracking-[0.18em] uppercase ${
            arrived
              ? 'text-emerald-700 dark:text-emerald-300'
              : ambulance.stage === 'DISPATCHED'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-red-700 dark:text-red-300'
          }`}
        >
          {heading}
        </p>
        <span className="rounded-sm border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-700 uppercase dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300">
          Simulated
        </span>
      </header>

      <div className="flex items-baseline justify-between gap-2 border-b border-slate-200 px-3 py-1.5 text-[10px] dark:border-slate-800">
        <span className="tracking-[0.14em] text-slate-500 uppercase">
          {ambulance.stage === 'DISPATCHED' ? 'EN ROUTE TO INTERCEPT' : ambulance.stage}
        </span>
        <span className="font-mono text-slate-700 dark:text-slate-300">
          {arrived
            ? 'at hospital'
            : `${(ambulance.distanceRemainingMeters / 1000).toFixed(1)} km left · ETA ${eta}`}
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-200 text-[11px] dark:divide-slate-800">
        <dl className="px-3 py-2">
          <p className="mb-1 text-[9px] tracking-[0.16em] text-slate-500 uppercase">Ambulance</p>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Unit</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {ambulance.vehicleCode ?? '-'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Speed</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {vehicle ? `${vehicle.speedKmh} km/h` : '-'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Position</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {vehicle ? `${vehicle.position[0].toFixed(3)}, ${vehicle.position[1].toFixed(3)}` : '-'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">From</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {ambulance.startName}
            </dd>
          </div>
          <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800">
            <dt className="text-[9px] tracking-[0.16em] text-slate-500 uppercase">
              {ambulance.destinationKind === 'HOSPITAL' ? 'Destination hospital' : 'Destination'}
            </dt>
            <dd className="leading-snug text-slate-800 dark:text-slate-200">
              {ambulance.destinationName}
            </dd>
            <dd className="font-mono text-[10px] text-slate-500">
              {((ambulance.destinationChainageMeters - (vehicle?.distanceAlongMeters ?? 0)) / 1000)
                .toFixed(1)}{' '}
              km to run
            </dd>
          </div>
        </dl>

        <dl className="px-3 py-2">
          <p className="mb-1 text-[9px] tracking-[0.16em] text-slate-500 uppercase">
            Assigned drone
          </p>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Unit</dt>
            <dd className="font-mono text-red-600 dark:text-red-400">
              {ambulance.assignedDroneCode ?? 'none available'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Lead</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {ambulance.stage === 'DISPATCHED'
                ? 'Intercepting...'
                : `${ambulance.droneLeadMeters} m ahead`}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Speaker</dt>
            <dd
              className={`font-mono ${
                drone?.speakerStatus === 'ACTIVE'
                  ? 'font-semibold text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {drone?.speakerStatus === 'ACTIVE' ? 'ACTIVE' : 'IDLE (Standby)'}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">Battery</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {drone ? `${drone.batteryPercentage.toFixed(0)}%` : '-'}
            </dd>
          </div>
        </dl>
      </div>

      {ambulance.speakerMessage && (
        <p className="border-t border-slate-200 px-3 py-1.5 text-[10px] leading-snug text-slate-600 italic dark:border-slate-800 dark:text-slate-400">
          Simulated speaker: &ldquo;{ambulance.speakerMessage}&rdquo;
        </p>
      )}
    </div>
  )
}
