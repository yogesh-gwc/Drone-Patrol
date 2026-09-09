import { postSimulationCommand } from '../services/simulationSocket'
import { useSimulationStore } from '../store/simulationStore'

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

/**
 * Stopped / suspicious vehicle incident.
 *
 * Times are SIMULATED minutes, so the 40 and 80 minute stages are reachable in
 * seconds at a raised simulation speed. Any police dispatch shown here is
 * simulated: nothing is contacted.
 */
export function SuspiciousPanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const incident = snapshot?.suspicious

  if (!incident) {
    return null
  }

  const escalated = incident.stage === 'POLICE_DISPATCH'
  const drone = snapshot?.drones.find((d) => d.code === incident.assignedDroneCode)
  const progress = Math.min(
    100,
    (incident.stoppedMinutes / incident.escalationThresholdMinutes) * 100,
  )

  return (
    <div
      className={`pointer-events-auto w-full shrink-0 rounded-md border bg-white/95 shadow-md backdrop-blur dark:bg-slate-950/90 ${
        escalated
          ? 'border-red-400 dark:border-red-900/70'
          : 'border-amber-400 dark:border-amber-900/60'
      }`}
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <p
          className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${
            escalated
              ? 'text-red-700 dark:text-red-300'
              : 'text-amber-700 dark:text-amber-300'
          }`}
        >
          {escalated ? 'Police dispatch' : 'Suspicious vehicle'}
        </p>
        <span className="rounded-sm border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-700 uppercase dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300">
          Simulated
        </span>
      </header>

      <dl className="px-3 py-1.5">
        <Row label="Incident" value={incident.id} />
        <Row label="Vehicle" value={incident.vehicleCode} />
        <Row label="Type" value={incident.vehicleKind} />
        <Row
          label="Status"
          value={escalated ? 'ESCALATED' : 'SUSPICIOUS'}
          tone={
            escalated
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }
        />
        <Row
          label="Stopped"
          value={`${incident.stoppedMinutes.toFixed(0)} min`}
          tone="text-amber-600 dark:text-amber-400"
        />
        <Row
          label="Thresholds"
          value={`${incident.suspiciousThresholdMinutes} / ${incident.escalationThresholdMinutes} min`}
        />
        <Row label="Location" value={`NH-44 ${(incident.chainageMeters / 1000).toFixed(1)} km`} />
        <Row label="Sector" value={incident.sectorName} />
        <Row label="Drone" value={incident.assignedDroneCode ?? 'none available'} />
        <Row
          label="Drone status"
          value={incident.droneOnStation ? 'MONITORING' : `EN ROUTE ${incident.droneDistanceMeters} m`}
          tone={
            incident.droneOnStation
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-sky-600 dark:text-sky-400'
          }
        />
        <Row
          label="Speaker"
          value={drone?.speakerStatus ?? 'IDLE'}
          tone={
            drone?.speakerStatus === 'ACTIVE'
              ? 'text-red-600 dark:text-red-400'
              : undefined
          }
        />
      </dl>

      {/* Progress toward the escalation threshold. */}
      <div className="px-3 pb-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full ${escalated ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {incident.speakerMessage && (
        <p className="border-t border-slate-200 px-3 py-1.5 text-[10px] leading-snug text-slate-600 italic dark:border-slate-800 dark:text-slate-400">
          Simulated speaker: &ldquo;{incident.speakerMessage}&rdquo;
        </p>
      )}

      {escalated && (
        <p className="border-t border-red-200 px-3 py-1.5 text-[10px] leading-snug text-red-700 dark:border-red-900/50 dark:text-red-300">
          POLICE DISPATCH SIMULATED &mdash; no call is placed and no emergency service is
          contacted.
        </p>
      )}

      <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => void postSimulationCommand(`/api/vehicles/${incident.vehicleCode}/start`)}
          className="w-full rounded-sm border border-slate-300 px-2 py-1 text-[10px] tracking-wide text-slate-600 uppercase hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
        >
          Resolve &amp; move vehicle on
        </button>
      </div>
    </div>
  )
}
