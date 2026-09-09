import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'
import type { IncidentAssessment, IncidentRiskLevel } from '../types/agents'

const RISK_BADGE: Record<IncidentRiskLevel, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
  MEDIUM: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' },
  HIGH: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800' },
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-800' },
}

export function IncidentDecisionCard() {
  const activeIncidents = useAgentStore((state) => state.activeIncidents)
  const selectedIncidentId = useAgentStore((state) => state.selectedIncidentId)
  const [escalating, setEscalating] = useState(false)

  if (activeIncidents.length === 0) {
    return null
  }

  // Display the selected incident or the highest risk incident
  const incident: IncidentAssessment =
    activeIncidents.find((i) => i.incidentId === selectedIncidentId) ||
    [...activeIncidents].sort((a, b) => {
      const order: Record<IncidentRiskLevel, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return order[b.risk] - order[a.risk]
    })[0]!

  const badge = RISK_BADGE[incident.risk] || RISK_BADGE.LOW

  const handlePoliceApprove = async () => {
    setEscalating(true)
    try {
      const base = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:4000'
      // Trigger escalation in backend
      await fetch(`${base}/api/simulation/suspicious-vehicle`, { method: 'POST' }).catch(() => {})
      incident.policeDispatchSimulated = true
      incident.state = 'ESCALATED'
    } finally {
      setEscalating(false)
    }
  }

  return (
    <div className="pointer-events-auto w-full shrink-0 rounded-md border border-slate-300 bg-white/95 p-3 shadow-md backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/90">
      <header className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-slate-800 uppercase dark:text-slate-200">
            Incident AI Assessment
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {incident.incidentId}
          </span>
        </div>
        <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
          {incident.risk} RISK
        </span>
      </header>

      <div className="space-y-2 py-2 text-[11px]">
        {/* What happened */}
        <div>
          <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">What Happened</p>
          <p className="mt-0.5 leading-snug text-slate-800 dark:text-slate-200">
            {incident.whatHappened || `Vehicle ${incident.vehicleCode} (${incident.vehicleKind}) is stationary for ${incident.stoppedDurationMinutes.toFixed(0)} min.`}
          </p>
        </div>

        {/* Investigated Evidence Factors */}
        {incident.whatWasInvestigated.length > 0 && (
          <div className="rounded border border-slate-100 bg-slate-50/50 p-1.5 dark:border-slate-800/60 dark:bg-slate-900/30">
            <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Investigated Factors</p>
            <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
              {incident.whatWasInvestigated.map((factor, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="text-indigo-500 text-[10px]">&#8226;</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Telemetry quick glance */}
        <div className="grid grid-cols-2 gap-1.5 rounded border border-slate-200 p-1.5 text-[10px] dark:border-slate-800">
          <div>
            <span className="text-slate-500">Duration:</span>{' '}
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {incident.stoppedDurationMinutes.toFixed(0)} min
            </span>
          </div>
          <div>
            <span className="text-slate-500">Position:</span>{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {incident.lane === 0 ? 'Shoulder' : 'Active Lane'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Traffic Impact:</span>{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {incident.trafficImpact}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Drone Escort:</span>{' '}
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {incident.assignedDroneCode || 'None'}
            </span>
          </div>
        </div>

        {/* Recommendation & Reason */}
        <div>
          <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Recommendation</p>
          <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
            {incident.recommendation || 'Continue automated drone observation.'}
          </p>
          {incident.reason && (
            <p className="mt-1 text-[10px] italic text-slate-600 dark:text-slate-400">
              &ldquo;{incident.reason}&rdquo;
            </p>
          )}
        </div>

        {/* Police Dispatch recommendation action */}
        {(incident.risk === 'HIGH' || incident.risk === 'CRITICAL' || incident.state === 'ESCALATED') && (
          <div className="rounded border border-red-200 bg-red-50/70 p-2 dark:border-red-900/60 dark:bg-red-950/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-red-700 uppercase dark:text-red-300">
                Simulated 100 Police Dispatch
              </span>
              <span className="text-[8px] font-mono tracking-widest text-red-600 uppercase dark:text-red-400">
                {incident.policeDispatchSimulated ? 'DISPATCHED' : 'REQUIRES APPROVAL'}
              </span>
            </div>
            {!incident.policeDispatchSimulated ? (
              <button
                type="button"
                disabled={escalating}
                onClick={handlePoliceApprove}
                className="mt-1.5 w-full rounded-sm bg-red-600 py-1 text-center text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {escalating ? 'Dispatching...' : 'Approve Police Dispatch'}
              </button>
            ) : (
              <p className="mt-1 text-[9px] text-red-600 dark:text-red-400">
                Simulated patrol unit alerted. NH-44 highway patrol advised.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
