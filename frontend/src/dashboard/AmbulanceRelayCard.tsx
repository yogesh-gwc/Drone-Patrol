import { useState } from 'react'
import { approveRelayRecommendation, rejectRelayRecommendation } from '../services/agentService'
import { useAgentStore } from '../store/agentStore'
import type { EscortRelayRecommendation } from '../types/agents'

export function AmbulanceRelayCard() {
  const activeFeasibility = useAgentStore((state) => state.activeEscortFeasibility)
  const pendingRelays = useAgentStore((state) => state.pendingRelayRecommendations)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState(false)

  if (!activeFeasibility && pendingRelays.length === 0) {
    return null
  }

  const relayRec: EscortRelayRecommendation | undefined = pendingRelays[0]
  const isSubmitting = relayRec && submittingId === relayRec.id

  const handleApprove = async () => {
    if (!relayRec) return
    setSubmittingId(relayRec.id)
    try {
      await approveRelayRecommendation(relayRec.id)
    } finally {
      setSubmittingId(null)
    }
  }

  const handleReject = async () => {
    if (!relayRec) return
    setSubmittingId(relayRec.id)
    try {
      await rejectRelayRecommendation(relayRec.id)
    } finally {
      setSubmittingId(null)
    }
  }

  const isDeficit = activeFeasibility ? !activeFeasibility.feasible : !!relayRec
  const currentDrone = activeFeasibility?.assignedDroneCode || relayRec?.currentDroneCode || 'UNKNOWN'
  const currentModel = activeFeasibility?.droneModel || relayRec?.currentDroneModel || 'AeroGuard Drone'
  const currentBattery = activeFeasibility?.currentBatteryPercent ?? relayRec?.currentDroneBattery ?? 0
  const requiredBattery = activeFeasibility?.requiredBatteryPercent ?? relayRec?.requiredBatteryPercent ?? 0
  const hospital = activeFeasibility?.hospitalName || relayRec?.hospitalName || 'Destination Hospital'
  const distKm = activeFeasibility
    ? (activeFeasibility.distanceToHospitalMeters / 1000).toFixed(1)
    : relayRec
      ? (relayRec.distanceRemainingMeters / 1000).toFixed(1)
      : '0.0'
  const reasoning = activeFeasibility?.reasoning || relayRec?.explanation || ''

  return (
    <div
      className={`pointer-events-auto w-full shrink-0 rounded-md border p-3 shadow-lg backdrop-blur transition-all duration-300 ${
        isDeficit
          ? 'border-rose-400/90 bg-rose-950/20 text-slate-100 dark:border-rose-500/80 dark:bg-slate-950/95'
          : 'border-emerald-400/90 bg-emerald-950/20 text-slate-100 dark:border-emerald-500/80 dark:bg-slate-950/95'
      }`}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-700/50 pb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex h-2 w-2 rounded-full ${
              isDeficit ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-slate-100 uppercase">
            AI Escort Endurance Check
          </h3>
        </div>
        <span
          className={`rounded-sm border px-1.5 py-0.5 text-[8px] font-mono tracking-wider uppercase font-semibold ${
            isDeficit
              ? 'border-rose-400 bg-rose-950/70 text-rose-300'
              : 'border-emerald-400 bg-emerald-950/70 text-emerald-300'
          }`}
        >
          {isDeficit ? 'RELAY ADVISORY' : 'JOURNEY FEASIBLE'}
        </span>
      </header>

      {/* Drone Specs & Mission Scope */}
      <div className="pt-2 text-[11px]">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] text-slate-400">Assigned Escort</span>
            <p className="font-mono font-bold text-sky-400 text-xs">
              {currentDrone} <span className="text-[10px] font-normal text-slate-300">({currentModel})</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400">Destination</span>
            <p className="font-semibold text-slate-200 truncate max-w-[120px]">{hospital}</p>
          </div>
        </div>

        {/* Battery Telemetry Bar */}
        <div className="mt-2.5 rounded border border-slate-700/60 bg-slate-900/60 p-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-slate-400">Distance Remaining</span>
            <span className="font-mono font-medium text-slate-200">{distKm} km</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800">
            <div>
              <span className="text-slate-400">Current Battery:</span>
              <span
                className={`ml-1.5 font-mono font-bold ${
                  currentBattery < requiredBattery ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {currentBattery.toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-slate-400">Required:</span>
              <span className="ml-1.5 font-mono font-bold text-amber-300">{requiredBattery.toFixed(0)}%</span>
            </div>
          </div>

          {/* Battery Status Gauge */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                isDeficit ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (currentBattery / Math.max(1, requiredBattery)) * 100)}%` }}
            />
          </div>

          {activeFeasibility?.depletionDistanceKm !== undefined &&
            activeFeasibility?.depletionDistanceKm !== null &&
            activeFeasibility.depletionDistanceKm > 0 && (
              <p className="mt-1.5 text-[9px] text-rose-300 font-mono">
                ⚠️ Safe reserve reached at {activeFeasibility.depletionDistanceKm} km before hospital.
              </p>
            )}
        </div>

        {/* Self-Reflection Reason Box */}
        <div className="mt-2.5 rounded border border-indigo-900/40 bg-indigo-950/30 p-2 text-[10px] leading-relaxed">
          <div className="flex items-center gap-1 font-semibold text-indigo-300 mb-0.5">
            <span>🤖 AI Self-Reflection & Analysis</span>
          </div>
          <p className="italic text-slate-300 line-clamp-3 hover:line-clamp-none transition-all">
            &ldquo;{reasoning}&rdquo;
          </p>
        </div>

        {/* Technical Specs Toggle */}
        <button
          type="button"
          onClick={() => setExpandedDetails(!expandedDetails)}
          className="mt-1.5 flex w-full items-center justify-between text-[9px] text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider"
        >
          <span>Airframe Specifications</span>
          <span>{expandedDetails ? '▲' : '▼'}</span>
        </button>

        {expandedDetails && (
          <div className="mt-1 rounded bg-slate-900/80 p-2 text-[9px] font-mono text-slate-300 border border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span>{currentModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cruising Speed:</span>
              <span>85 km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Discharge Rate:</span>
              <span>2.8% per km (escort mode)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Safety Reserve Floor:</span>
              <span>20% (Emergency Return to Dock)</span>
            </div>
          </div>
        )}

        {/* Relay Action Card */}
        {relayRec && relayRec.status === 'PENDING_APPROVAL' && (
          <div className="mt-3 rounded border border-amber-500/60 bg-amber-950/40 p-2.5 shadow-inner animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-amber-300 tracking-wider uppercase">Relay Handover Candidate</span>
              <span className="font-mono text-[9px] bg-amber-900/60 px-1 py-0.5 rounded text-amber-200">
                {relayRec.id}
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[11px] bg-slate-900/70 p-1.5 rounded border border-amber-900/40">
              <div>
                <p className="font-bold font-mono text-emerald-400">{relayRec.relayDroneCode}</p>
                <p className="text-[9px] text-slate-400">{relayRec.relayDroneModel}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400">Battery</span>
                <p className="font-mono font-bold text-emerald-400">{relayRec.relayDroneBattery.toFixed(0)}%</p>
              </div>
            </div>

            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleApprove}
                className="flex-1 rounded bg-emerald-600 px-2 py-1.5 text-[10px] font-bold tracking-wider text-white uppercase shadow hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? 'Relaying...' : '✓ Approve Relay Handoff'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleReject}
                className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-300 uppercase hover:bg-slate-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
