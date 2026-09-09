import { useAgentStore } from '../store/agentStore'

const PANEL =
  'rounded-md border border-slate-300 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80'
const HEADING =
  'mb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase'

export function AgentActivityPanel() {
  const snapshot = useAgentStore((state) => state.snapshot)
  const pendingCount = useAgentStore((state) => state.pendingRecommendations.length)
  const incidentsCount = useAgentStore((state) => state.activeIncidents.length)
  const setAuditOpen = useAgentStore((state) => state.setAuditModalOpen)

  const droneStatus = snapshot?.droneAgentStatus || 'IDLE'
  const incidentStatus = snapshot?.incidentAgentStatus || 'IDLE'

  return (
    <section className={`${PANEL} pointer-events-auto flex w-56 flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <h2 className={HEADING}>Agent Intelligence</h2>
        <span className="rounded-sm border border-indigo-300 bg-indigo-50 px-1 py-0.2 text-[8px] font-medium tracking-wider text-indigo-700 uppercase dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
          LangGraph
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        {/* Drone Assignment Agent */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800/60">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Drone Dispatcher</p>
            <p className="text-[9px] text-slate-500">Fleet Suitability Reasoning</p>
          </div>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
              droneStatus === 'EVALUATING'
                ? 'animate-pulse bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : droneStatus === 'DISPATCHED'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                droneStatus === 'EVALUATING'
                  ? 'bg-sky-500'
                  : droneStatus === 'DISPATCHED'
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
              }`}
            />
            {droneStatus}
          </span>
        </div>

        {/* Incident Investigation Agent */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-1.5 dark:border-slate-800/60">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Incident Analyst</p>
            <p className="text-[9px] text-slate-500">Context & Risk Reasoning</p>
          </div>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${
              incidentStatus === 'INVESTIGATING'
                ? 'animate-pulse bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : incidentStatus === 'OBSERVING'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                  : incidentStatus === 'ESCALATED'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                incidentStatus === 'INVESTIGATING'
                  ? 'bg-amber-500'
                  : incidentStatus === 'ESCALATED'
                    ? 'bg-red-500'
                    : incidentStatus === 'OBSERVING'
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
              }`}
            />
            {incidentStatus}
          </span>
        </div>

        {/* Operational counts */}
        <dl className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5 text-[10px]">
          <dt className="text-slate-500">Active Incidents</dt>
          <dd className="text-right font-mono font-medium text-slate-800 dark:text-slate-200">
            {incidentsCount}
          </dd>
          <dt className="text-slate-500">Pending Actions</dt>
          <dd
            className={`text-right font-mono font-medium ${
              pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {pendingCount}
          </dd>
        </dl>
      </div>

      <button
        type="button"
        onClick={() => setAuditOpen(true)}
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-medium tracking-wide text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span className="text-[11px]">&#128220;</span>
        View Audit Journal
      </button>
    </section>
  )
}
