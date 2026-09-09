import { useState } from 'react'
import { useSimulationStore } from '../../store/simulationStore'
import type { DashboardState } from '../../types/simulation'
import { DepartmentDrawer, DEPARTMENT_TITLES } from './DepartmentDrawer'
import type { DepartmentId } from './DepartmentDrawer'
import { ACTIVITY_TONE, CONGESTION_TONE, clockTime, duration, rupees } from './dashboardFormat'

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white/90 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-[8.5px] leading-tight tracking-[0.14em] text-slate-500 uppercase">
        {label}
      </p>
      <p
        className={`font-mono text-lg leading-tight ${tone ?? 'text-slate-900 dark:text-slate-100'}`}
      >
        {value}
      </p>
    </div>
  )
}

function DeptRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`font-mono text-[11px] ${tone ?? 'text-slate-800 dark:text-slate-200'}`}>
        {value}
      </span>
    </div>
  )
}

function DepartmentCard({
  id,
  index,
  accent,
  rows,
  onOpen,
}: {
  id: DepartmentId
  index: number
  accent: string
  rows: { label: string; value: string; tone?: string }[]
  onOpen: (id: DepartmentId) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="w-full rounded-sm border border-slate-200 bg-white/90 p-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-800 dark:hover:bg-indigo-500/10"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`h-3 w-1 rounded-full ${accent}`} />
        <span className="text-[9.5px] font-semibold tracking-[0.14em] text-slate-700 uppercase dark:text-slate-300">
          {index}. {DEPARTMENT_TITLES[id]}
        </span>
      </div>
      <div className="space-y-0.5">
        {rows.map((row) => (
          <DeptRow key={row.label} {...row} />
        ))}
      </div>
      <p className="mt-1.5 text-[8.5px] tracking-[0.14em] text-indigo-600 uppercase dark:text-indigo-400">
        Open detail
      </p>
    </button>
  )
}

/**
 * Drone Patrol home dashboard.
 *
 * A floating command overlay on the LEFT of the viewport with the live 3D
 * NH-44 corridor visible behind and beside it. It is an overlay rather than a
 * route on purpose: `MapScene` never unmounts, so minimising and reopening the
 * dashboard leaves the map, its camera, the Three.js scene and the Socket.IO
 * stream completely untouched.
 *
 * Every figure comes from the simulation snapshot - the seeded baseline in
 * `backend/data/dashboard.json` plus events this run produced. Nothing is
 * hard-coded here, and none of it is real government data.
 */
export function HomeDashboard({ onMinimize }: { onMinimize: () => void }) {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const connected = useSimulationStore((state) => state.connected)
  const [open, setOpen] = useState<DepartmentId | null>(null)

  const dashboard: DashboardState | undefined = snapshot?.dashboard
  if (!dashboard) {
    return (
      <div className="pointer-events-auto w-[22rem] rounded-md border border-slate-300 bg-white/95 px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-950/95">
        <p className="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
          Connecting to corridor telemetry…
        </p>
      </div>
    )
  }

  const { emergency, traffic, publicSafety, droneOperations, activity } = dashboard

  return (
    <>
      <div className="pointer-events-auto flex h-full w-[23rem] flex-col rounded-md border border-slate-300 bg-white/95 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/92">
        {/* Header */}
        <header className="shrink-0 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[13px] font-semibold tracking-[0.2em] text-slate-900 uppercase dark:text-slate-100">
                Drone Patrol
              </h1>
              <p className="text-[9px] tracking-[0.16em] text-slate-500 uppercase">
                Krishnagiri &rarr; Hosur &middot; NH-44 corridor
              </p>
            </div>
            <button
              type="button"
              onClick={onMinimize}
              className="shrink-0 rounded-sm border border-slate-300 px-2 py-1 text-[8.5px] font-medium tracking-[0.14em] text-slate-600 uppercase transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Minimize
            </button>
          </div>

          {/* System status */}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[8.5px] tracking-[0.12em] uppercase">
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
              />
              <span className="text-slate-500">API</span>
              <span className={connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                {connected ? 'Online' : 'Offline'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
              />
              <span className="text-slate-500">Socket</span>
              <span className={connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                {connected ? 'Connected' : 'Down'}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${snapshot?.running ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              <span className="text-slate-500">Simulation</span>
              <span
                className={
                  snapshot?.running
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {snapshot?.running ? 'Active' : 'Paused'}
              </span>
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-1.5">
            <Kpi label="Total drones" value={String(droneOperations.total)} />
            <Kpi
              label="Active patrol"
              value={String(droneOperations.patrolling)}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <Kpi label="Escorted" value={String(emergency.ambulancesEscorted)} />
            <Kpi label="SOS responses" value={String(emergency.sosResponses)} />
            <Kpi
              label="Violations"
              value={String(traffic.speedViolations)}
              tone="text-amber-600 dark:text-amber-400"
            />
            <Kpi
              label="Suspicious"
              value={String(publicSafety.suspiciousVehicles)}
              tone="text-orange-600 dark:text-orange-400"
            />
          </div>

          <p className="mt-1.5 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1 text-[8.5px] leading-snug text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300">
            Simulated demonstration data. Not real government statistics, enforcement records or
            emergency-service activity.
          </p>

          {/* Departments */}
          <p className="mt-2.5 mb-1 text-[9px] tracking-[0.16em] text-slate-500 uppercase">
            Departments
          </p>
          <div className="space-y-1.5">
            <DepartmentCard
              id="emergency"
              index={1}
              accent="bg-red-500"
              onOpen={setOpen}
              rows={[
                { label: 'Ambulances escorted', value: String(emergency.ambulancesEscorted) },
                {
                  label: 'Active escorts',
                  value: String(emergency.activeEscorts),
                  tone: emergency.activeEscorts > 0 ? 'text-red-600 dark:text-red-400' : undefined,
                },
                { label: 'Completed trips', value: String(emergency.completedTrips) },
                {
                  label: 'Avg escort response',
                  value: duration(emergency.averageEscortResponseSeconds),
                },
                { label: 'SOS responses', value: String(emergency.sosResponses) },
              ]}
            />
            <DepartmentCard
              id="traffic"
              index={2}
              accent="bg-amber-500"
              onOpen={setOpen}
              rows={[
                { label: 'Speed violations', value: String(traffic.speedViolations) },
                { label: 'Simulated fines', value: rupees(traffic.simulatedFines) },
                { label: 'Vehicles monitored', value: String(traffic.vehiclesMonitored) },
                { label: 'Currently stopped', value: String(traffic.vehiclesStopped) },
                {
                  label: 'Congestion',
                  value: traffic.congestion,
                  tone: CONGESTION_TONE[traffic.congestion],
                },
              ]}
            />
            <DepartmentCard
              id="safety"
              index={3}
              accent="bg-indigo-500"
              onOpen={setOpen}
              rows={[
                { label: 'SOS requests', value: String(publicSafety.sosRequests) },
                { label: 'Resolved SOS', value: String(publicSafety.resolvedSos) },
                { label: 'Suspicious vehicles', value: String(publicSafety.suspiciousVehicles) },
                {
                  label: 'Active investigations',
                  value: String(publicSafety.activeInvestigations),
                  tone:
                    publicSafety.activeInvestigations > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : undefined,
                },
                { label: 'Police dispatches (sim)', value: String(publicSafety.policeDispatches) },
              ]}
            />
            <DepartmentCard
              id="drones"
              index={4}
              accent="bg-emerald-500"
              onOpen={setOpen}
              rows={[
                { label: 'Patrolling', value: String(droneOperations.patrolling) },
                { label: 'Charging', value: String(droneOperations.charging) },
                { label: 'Escorting', value: String(droneOperations.escorting) },
                {
                  label: 'Average battery',
                  value: `${droneOperations.averageBatteryPercentage}%`,
                },
                {
                  label: 'Pads occupied',
                  value: `${droneOperations.chargingPadsOccupied} / ${droneOperations.chargingPadsTotal}`,
                },
              ]}
            />
          </div>

          {/* Recent activity */}
          <p className="mt-2.5 mb-1 text-[9px] tracking-[0.16em] text-slate-500 uppercase">
            Recent activity
          </p>
          <ul className="space-y-0.5">
            {activity.slice(0, 8).map((event) => (
              <li key={event.id} className="flex gap-2 py-0.5">
                <span className="mt-1 font-mono text-[9px] text-slate-400">
                  {clockTime(event.atIso)}
                </span>
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${ACTIVITY_TONE[event.kind]}`} />
                <span className="min-w-0">
                  <span className="block text-[10px] leading-tight text-slate-800 dark:text-slate-200">
                    {event.title}
                  </span>
                  <span className="block truncate text-[9px] text-slate-500">{event.detail}</span>
                </span>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="py-1 text-[10px] text-slate-500">No activity recorded yet.</li>
            )}
          </ul>
        </div>
      </div>

      {open && (
        <DepartmentDrawer
          department={open}
          dashboard={dashboard}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  )
}
