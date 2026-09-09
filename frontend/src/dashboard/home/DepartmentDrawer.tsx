import type { DashboardState } from '../../types/simulation'
import { CONGESTION_TONE, duration, rupees } from './dashboardFormat'

export type DepartmentId = 'emergency' | 'traffic' | 'safety' | 'drones'

export const DEPARTMENT_TITLES: Record<DepartmentId, string> = {
  emergency: 'Emergency response',
  traffic: 'Traffic enforcement',
  safety: 'Public safety',
  drones: 'Drone operations',
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-[9px] tracking-[0.14em] text-slate-500 uppercase">{label}</p>
      <p className={`mt-0.5 font-mono text-base ${tone ?? 'text-slate-900 dark:text-slate-100'}`}>
        {value}
      </p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 mb-1 text-[9px] tracking-[0.16em] text-slate-500 uppercase">{children}</p>
  )
}

/**
 * Expanded view for one department.
 *
 * Opens as a drawer over the dashboard rather than a route, so the map, the
 * simulation and the socket are untouched by opening it.
 *
 * SIMULATED DATA THROUGHOUT - see `backend/data/dashboard.json`.
 */
export function DepartmentDrawer({
  department,
  dashboard,
  onClose,
}: {
  department: DepartmentId
  dashboard: DashboardState
  onClose: () => void
}) {
  const { emergency, traffic, publicSafety, droneOperations } = dashboard

  return (
    <div className="pointer-events-auto flex h-full w-[27rem] flex-col rounded-md border border-slate-300 bg-white/97 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <div>
          <h2 className="text-[12px] font-semibold tracking-[0.16em] text-slate-900 uppercase dark:text-slate-100">
            {DEPARTMENT_TITLES[department]}
          </h2>
          <p className="text-[9px] tracking-[0.14em] text-slate-500 uppercase">
            Simulated demonstration data
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close department detail"
          className="rounded-sm border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:hover:text-slate-100"
        >
          &times;
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {department === 'emergency' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Escorted" value={String(emergency.ambulancesEscorted)} />
              <Stat
                label="Active"
                value={String(emergency.activeEscorts)}
                tone={emergency.activeEscorts > 0 ? 'text-red-600 dark:text-red-400' : undefined}
              />
              <Stat label="Completed" value={String(emergency.completedTrips)} />
              <Stat label="Avg response" value={duration(emergency.averageEscortResponseSeconds)} />
              <Stat label="SOS responses" value={String(emergency.sosResponses)} />
              <Stat
                label="Active SOS"
                value={String(emergency.activeSos)}
                tone={emergency.activeSos > 0 ? 'text-red-600 dark:text-red-400' : undefined}
              />
            </div>

            <SectionTitle>Ambulance escorts</SectionTitle>
            <ul className="space-y-1">
              {emergency.recentEscorts.map((escort, index) => (
                <li
                  key={`${escort.code}-${index}`}
                  className="flex items-baseline justify-between gap-2 rounded-sm border border-slate-200 px-2 py-1.5 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-slate-900 dark:text-slate-100">
                      {escort.code}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">{escort.route}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[9px] tracking-wide uppercase ${
                      escort.status === 'ACTIVE'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {escort.status}
                  </span>
                </li>
              ))}
            </ul>

            <SectionTitle>SOS events</SectionTitle>
            <ul className="space-y-1">
              {emergency.recentSos.map((sos, index) => (
                <li
                  key={`${sos.code}-${index}`}
                  className="flex items-baseline justify-between gap-2 rounded-sm border border-slate-200 px-2 py-1.5 dark:border-slate-800"
                >
                  <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100">
                    {sos.code}
                  </span>
                  <span className="text-[10px] text-slate-500">{sos.location}</span>
                  <span className="text-[9px] tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                    {sos.status}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {department === 'traffic' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Monitored" value={String(traffic.vehiclesMonitored)} />
              <Stat label="Violations" value={String(traffic.speedViolations)} />
              <Stat label="Fines" value={rupees(traffic.simulatedFines)} />
              <Stat label="Stopped" value={String(traffic.vehiclesStopped)} />
              <Stat label="Avg speed" value={`${traffic.averageSpeedKmh} km/h`} />
              <Stat
                label="Congestion"
                value={traffic.congestion}
                tone={CONGESTION_TONE[traffic.congestion]}
              />
            </div>

            <p className="mt-2 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1.5 text-[9px] leading-snug text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300">
              Enforcement records are SIMULATED. No fine is issued and no payment or enforcement
              system is contacted. Speed limit {traffic.speedLimitKmh} km/h.
            </p>

            <SectionTitle>Recent speed violations</SectionTitle>
            <ul className="space-y-1">
              {traffic.recentViolations.map((v, index) => (
                <li
                  key={`${v.code}-${index}`}
                  className="rounded-sm border border-slate-200 px-2 py-1.5 dark:border-slate-800"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100">
                      {v.code}
                    </span>
                    <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                      {v.speedKmh} km/h
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-[10px] text-slate-500">
                    <span>
                      {v.location} &middot; limit {traffic.speedLimitKmh}
                    </span>
                    <span>
                      {rupees(v.fine)} &middot;{' '}
                      <span className="tracking-wide uppercase">simulated</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {department === 'safety' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="SOS requests" value={String(publicSafety.sosRequests)} />
              <Stat label="Resolved" value={String(publicSafety.resolvedSos)} />
              <Stat label="Suspicious" value={String(publicSafety.suspiciousVehicles)} />
              <Stat
                label="Investigating"
                value={String(publicSafety.activeInvestigations)}
                tone={
                  publicSafety.activeInvestigations > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : undefined
                }
              />
              <Stat label="Long stopped" value={String(publicSafety.longStoppedVehicles)} />
              <Stat label="Police (sim)" value={String(publicSafety.policeDispatches)} />
            </div>

            <p className="mt-2 rounded-sm border border-amber-300 bg-amber-50 px-2 py-1.5 text-[9px] leading-snug text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300">
              Police dispatch is SIMULATED. No call is placed and no police service is contacted.
            </p>

            <SectionTitle>Stopped-vehicle watchlist</SectionTitle>
            <ul className="space-y-1">
              {publicSafety.watchlist.map((entry, index) => (
                <li
                  key={`${entry.code}-${index}`}
                  className="rounded-sm border border-slate-200 px-2 py-1.5 dark:border-slate-800"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100">
                      {entry.code}
                    </span>
                    <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                      {entry.stoppedMinutes} min
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{entry.location}</p>
                  <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400">
                    {entry.reason}
                  </p>
                  <p
                    className={`mt-0.5 text-[9px] tracking-wide uppercase ${
                      entry.status.includes('POLICE')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {entry.status}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {department === 'drones' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Total" value={String(droneOperations.total)} />
              <Stat
                label="Patrolling"
                value={String(droneOperations.patrolling)}
                tone="text-emerald-600 dark:text-emerald-400"
              />
              <Stat
                label="Charging"
                value={String(droneOperations.charging)}
                tone="text-amber-600 dark:text-amber-400"
              />
              <Stat
                label="Escorting"
                value={String(droneOperations.escorting)}
                tone={
                  droneOperations.escorting > 0 ? 'text-red-600 dark:text-red-400' : undefined
                }
              />
              <Stat label="Available" value={String(droneOperations.available)} />
              <Stat
                label="Avg battery"
                value={`${droneOperations.averageBatteryPercentage}%`}
              />
              <Stat label="Stations" value={String(droneOperations.chargingStations)} />
              <Stat
                label="Pads in use"
                value={`${droneOperations.chargingPadsOccupied} / ${droneOperations.chargingPadsTotal}`}
              />
            </div>

            <SectionTitle>Zone coverage</SectionTitle>
            <ul className="space-y-1">
              {droneOperations.zones.map((zone) => (
                <li
                  key={zone.name}
                  className="flex items-baseline justify-between gap-2 rounded-sm border border-slate-200 px-2 py-1.5 dark:border-slate-800"
                >
                  <span className="text-[11px] tracking-wide text-slate-800 uppercase dark:text-slate-200">
                    {zone.name}
                  </span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {zone.droneCount} {zone.droneCount === 1 ? 'drone' : 'drones'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[9px] leading-snug text-slate-500">
              Coverage is the live count of drones nearest each corridor settlement, so it shifts
              as the fleet patrols.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
