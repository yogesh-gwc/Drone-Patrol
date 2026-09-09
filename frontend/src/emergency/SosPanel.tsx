import { inspectAt } from '../map/mapCamera'
import { getMapInstance } from '../map/mapRegistry'
import { postSimulationCommand } from '../services/simulationSocket'
import { useSimulationStore } from '../store/simulationStore'
import type { SosStage } from '../types/simulation'

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-[10px] tracking-wider text-slate-500 uppercase">{label}</dt>
      <dd className={`font-mono text-[11px] ${tone ?? 'text-slate-800 dark:text-slate-200'}`}>
        {value}
      </dd>
    </div>
  )
}

/** Response stages in order, for the progress strip. */
const STAGES: { stage: SosStage; short: string }[] = [
  { stage: 'DISPATCHED', short: 'Dispatch' },
  { stage: 'ON_SCENE', short: 'On scene' },
  { stage: 'ASSESSING', short: 'Assess' },
  { stage: 'MEDICAL_EN_ROUTE', short: 'Medical' },
  { stage: 'MEDICAL_ON_SCENE', short: 'Arrived' },
  { stage: 'RESOLVED', short: 'Closed' },
]

function eta(seconds: number | null): string {
  if (seconds === null) return '-'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/**
 * Live SOS status.
 *
 * Shown only while an SOS is active. Simulated throughout: no responder is
 * contacted and nothing here reaches an emergency service.
 *
 * The header is clickable and flies the map to the reported position - an
 * operator reading a latitude and longitude off a card has no way to find the
 * person otherwise.
 */
export function SosPanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const sos = snapshot?.sos

  if (!sos) {
    return null
  }

  const drone = snapshot?.drones.find((d) => d.code === sos.assignedDroneCode)
  const resolved = sos.stage === 'RESOLVED'
  const activeIndex = STAGES.findIndex((s) => s.stage === sos.stage)

  const locate = () => {
    const map = getMapInstance()
    if (map) {
      inspectAt(map, sos.position)
    }
  }

  return (
    <div className="pointer-events-auto w-full shrink-0 rounded-md border border-red-300 bg-white/95 shadow-md backdrop-blur dark:border-red-900/60 dark:bg-slate-950/90">
      <button
        type="button"
        onClick={locate}
        title="Show this SOS on the map"
        className="flex w-full items-center justify-between border-b border-red-200 px-3 py-2 text-left transition-colors hover:bg-red-50/60 dark:border-red-900/50 dark:hover:bg-red-500/10"
      >
        <span className="text-[11px] font-semibold tracking-[0.18em] text-red-700 uppercase dark:text-red-300">
          {resolved ? 'SOS Resolved' : 'SOS Active'}
        </span>
        <span className="rounded-sm border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-700 uppercase dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300">
          Simulated
        </span>
      </button>

      <p className="border-b border-slate-200 px-3 py-1 text-[9px] tracking-[0.14em] text-slate-500 uppercase dark:border-slate-800">
        Click the header to locate on map
      </p>

      {/* Stage strip: where the response has got to. */}
      <ol className="flex gap-0.5 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        {STAGES.map((entry, index) => (
          <li key={entry.stage} className="flex-1">
            <span
              className={`block h-1 rounded-full ${
                index <= activeIndex
                  ? resolved
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
            <span
              className={`mt-1 block text-[8px] tracking-wide uppercase ${
                index === activeIndex
                  ? 'text-slate-800 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              {entry.short}
            </span>
          </li>
        ))}
      </ol>

      <p className="px-3 py-2 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
        {sos.narrative}
      </p>

      <dl className="border-t border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <Row label="SOS ID" value={sos.id} />
        <Row
          label="Status"
          value={sos.status}
          tone={
            resolved
              ? 'text-emerald-600 dark:text-emerald-400'
              : sos.status === 'TRACKING'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
          }
        />
        <Row label="Latitude" value={sos.position[1].toFixed(6)} />
        <Row label="Longitude" value={sos.position[0].toFixed(6)} />
        <Row label="Person" value={sos.personReference} />
        <Row
          label="Drone"
          value={sos.assignedDroneCode ?? 'none available'}
          tone={sos.assignedDroneCode ? undefined : 'text-amber-600 dark:text-amber-400'}
        />
        <Row label="Distance" value={`${sos.droneDistanceMeters} m`} />
        {!sos.tracking && <Row label="Drone ETA" value={eta(sos.droneEtaSeconds)} />}
        {sos.tracking && (
          <Row label="Overwatch alt" value={`${sos.droneAltitudeMeters} m AGL`} />
        )}
        <Row label="Drone status" value={drone?.mode ?? '-'} />

        {sos.responderCode && (
          <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800">
            <p className="mb-0.5 text-[9px] tracking-[0.16em] text-slate-500 uppercase">
              Simulated medical unit
            </p>
            <Row label="Unit" value={sos.responderCode} />
            <Row label="From" value={sos.responderName ?? '-'} />
            {sos.responderDistanceMeters !== null && (
              <Row label="Distance" value={`${sos.responderDistanceMeters} m`} />
            )}
            {sos.responderEtaSeconds !== null && (
              <Row label="ETA" value={eta(sos.responderEtaSeconds)} />
            )}
          </div>
        )}

        {sos.nearestHospitalName && (
          <div className="mt-1 border-t border-slate-200 pt-1 dark:border-slate-800">
            <p className="text-[9px] tracking-[0.16em] text-slate-500 uppercase">
              Nearest hospital
            </p>
            <p className="py-0.5 text-[11px] text-slate-800 dark:text-slate-200">
              {sos.nearestHospitalName}
            </p>
            {sos.nearestHospitalMeters !== null && (
              <Row label="Straight line" value={`${(sos.nearestHospitalMeters / 1000).toFixed(1)} km`} />
            )}
          </div>
        )}
      </dl>

      <div className="flex gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <button
          type="button"
          onClick={locate}
          className="flex-1 rounded-sm border border-slate-300 px-2 py-1 text-[10px] tracking-wide text-slate-600 uppercase hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
        >
          Locate on map
        </button>
        <button
          type="button"
          onClick={() => void postSimulationCommand('/api/emergency/sos/stop')}
          title="Closes the SOS now and sends the drone back to its patrol zone"
          className="flex-1 rounded-sm border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-medium tracking-wide text-red-700 uppercase hover:bg-red-100 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
        >
          Stop SOS
        </button>
      </div>

      <p className="border-t border-slate-200 px-3 py-1.5 text-[9px] leading-snug text-slate-500 dark:border-slate-800">
        Simulated response. No emergency service is contacted and no call is placed.
      </p>
    </div>
  )
}
