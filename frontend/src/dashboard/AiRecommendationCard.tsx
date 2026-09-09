import { useState } from 'react'
import { approveAgentRecommendation, rejectAgentRecommendation } from '../services/agentService'
import { useAgentStore } from '../store/agentStore'
import type { DroneAssignmentRecommendation } from '../types/agents'

export function AiRecommendationCard() {
  const pendingRecommendations = useAgentStore((state) => state.pendingRecommendations)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [showRankingsId, setShowRankingsId] = useState<string | null>(null)

  if (pendingRecommendations.length === 0) {
    return null
  }

  const rec: DroneAssignmentRecommendation = pendingRecommendations[0]!
  const isSubmitting = submittingId === rec.id
  const showRankings = showRankingsId === rec.id

  const selectedCandidate = rec.candidates.find((c) => c.droneCode === rec.selectedDroneCode)

  const handleApprove = async () => {
    setSubmittingId(rec.id)
    try {
      await approveAgentRecommendation(rec.id)
    } finally {
      setSubmittingId(null)
    }
  }

  const handleReject = async () => {
    setSubmittingId(rec.id)
    try {
      await rejectAgentRecommendation(rec.id)
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="pointer-events-auto w-full shrink-0 rounded-md border border-amber-400 bg-white/95 p-3 shadow-md backdrop-blur dark:border-amber-700/70 dark:bg-slate-950/90">
      <header className="flex items-center justify-between border-b border-amber-200 pb-2 dark:border-amber-900/60">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <h3 className="text-[11px] font-semibold tracking-[0.16em] text-amber-800 uppercase dark:text-amber-300">
            AI Recommendation
          </h3>
        </div>
        <span className="rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[8px] font-mono tracking-widest text-amber-700 uppercase dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          HITL Review
        </span>
      </header>

      <div className="py-2.5 text-[11px]">
        <p className="font-medium text-slate-900 dark:text-slate-100">
          Dispatch <span className="font-mono text-indigo-600 dark:text-sky-400">{rec.selectedDroneCode}</span> to {rec.targetType} ({rec.targetId})?
        </p>

        {selectedCandidate && (
          <div className="mt-2 grid grid-cols-3 gap-2 rounded border border-slate-200 bg-slate-50/70 p-2 text-[10px] dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <span className="text-slate-500">Distance</span>
              <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {(selectedCandidate.distanceMeters / 1000).toFixed(1)} km
              </p>
            </div>
            <div>
              <span className="text-slate-500">ETA</span>
              <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {selectedCandidate.etaSeconds.toFixed(0)}s
              </p>
            </div>
            <div>
              <span className="text-slate-500">Battery</span>
              <p className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                {selectedCandidate.battery.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        <div className="mt-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-700 dark:text-slate-200">Reasoning:</p>
          <p className="italic text-slate-600 dark:text-slate-400">&ldquo;{rec.explanation}&rdquo;</p>
        </div>

        {/* Candidate rankings toggle */}
        <div className="mt-2 border-t border-slate-100 pt-1.5 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowRankingsId(showRankings ? null : rec.id)}
            className="flex w-full items-center justify-between text-[9px] font-semibold tracking-wider text-slate-500 uppercase hover:text-slate-800 dark:hover:text-slate-200"
          >
            <span>Candidate Fleet Ranking ({rec.candidates.length})</span>
            <span>{showRankings ? '▲' : '▼'}</span>
          </button>

          {showRankings && (
            <div className="mt-1.5 max-h-36 overflow-y-auto rounded border border-slate-200 bg-white p-1 text-[9px] dark:border-slate-800 dark:bg-slate-900">
              {rec.candidates.map((c) => (
                <div
                  key={c.droneCode}
                  className={`flex items-center justify-between border-b border-slate-100 px-1.5 py-1 last:border-b-0 dark:border-slate-800 ${
                    c.droneCode === rec.selectedDroneCode ? 'bg-amber-50/80 dark:bg-amber-950/40 font-medium' : ''
                  }`}
                >
                  <span className="font-mono">#{c.rank} {c.droneCode}</span>
                  <span className="text-slate-500">{(c.distanceMeters / 1000).toFixed(1)}km · {c.battery.toFixed(0)}%</span>
                  <span className={c.eligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 line-through'}>
                    {c.eligible ? `${c.score.toFixed(1)} pts` : 'Ineligible'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleApprove}
          className="flex-1 rounded-sm bg-emerald-600 px-3 py-1.5 text-center text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Executing...' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleReject}
          className="flex-1 rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-center text-[10px] font-semibold tracking-wider text-slate-700 uppercase transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
