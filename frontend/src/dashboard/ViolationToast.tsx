import { useEffect, useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import type { SpeedViolationRecord } from '../types/simulation'

export function ViolationToast() {
  const latestViolation = useSimulationStore((state) => state.snapshot?.latestViolation)
  const [current, setCurrent] = useState<SpeedViolationRecord | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!latestViolation) {
      return
    }
    // Show toast whenever a new violation arrives
    setCurrent(latestViolation)
    setVisible(true)

    const timer = setTimeout(() => {
      setVisible(false)
    }, 12000)

    return () => clearTimeout(timer)
  }, [latestViolation?.violationId])

  if (!visible || !current) {
    return null
  }

  return (
    <div className="pointer-events-auto fixed top-16 right-4 z-50 w-84 animate-in fade-in slide-in-from-top-3 duration-300 rounded-lg border border-amber-400 bg-white/95 p-3.5 shadow-xl backdrop-blur dark:border-amber-500/60 dark:bg-slate-900/95">
      <header className="flex items-center justify-between border-b border-amber-200 pb-2 dark:border-amber-900/50">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
          <p className="text-[11px] font-bold tracking-[0.16em] text-red-700 uppercase dark:text-red-400">
            Speed Violation Detected
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
        >
          ✕
        </button>
      </header>

      <div className="mt-2 text-[11px] space-y-1.5">
        <div className="flex justify-between">
          <span className="text-slate-500">Challan ID:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {current.violationId}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">Captured By:</span>
          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
            {current.capturedDroneId} ({current.capturedDroneName})
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">Vehicle:</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">
            {current.vehicleCode} ({current.vehicleKind})
          </span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-slate-500">Measured Speed:</span>
          <span className="font-mono font-bold text-red-600 dark:text-red-400">
            {current.measuredSpeedKmh} km/h{' '}
            <span className="text-[10px] text-slate-500 font-normal">
              (Limit: {current.speedLimitKmh} km/h)
            </span>
          </span>
        </div>

        <div className="flex justify-between items-baseline border-t border-slate-200 pt-1.5 dark:border-slate-800">
          <span className="text-slate-500">Fine Amount:</span>
          <span className="font-mono font-extrabold text-amber-700 dark:text-amber-300 text-[13px]">
            {current.fineAmount}
          </span>
        </div>

        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Sector: {current.location.sectorName}</span>
          <span className="text-emerald-600 dark:text-emerald-400">✓ Logged to JSON</span>
        </div>
      </div>
    </div>
  )
}
