import { useState } from 'react'
import { SosDialog } from '../emergency/SosDialog'
import { postSimulationCommand } from '../services/simulationSocket'
import { useSimulationStore } from '../store/simulationStore'

const PANEL =
  'rounded-md border border-slate-300 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80'
const HEADING =
  'mb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase'
const BUTTON =
  'rounded-sm border border-slate-300 px-2 py-1 text-[11px] tracking-wide text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-transparent dark:hover:text-slate-100'

/** Sets the simulation clock multiplier. */
async function postSpeed(speed: number): Promise<void> {
  const base = import.meta.env.VITE_API_URL?.trim() ?? 'http://localhost:4000'
  await fetch(`${base}/api/simulation/speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
  })
}

/** Fleet summary and the simulation controls used to drive the demo. */
export function OperationsPanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const connected = useSimulationStore((state) => state.connected)
  const [sosOpen, setSosOpen] = useState(false)

  const drones = snapshot?.drones ?? []
  const patrolling = drones.filter((d) => d.mode === 'PATROLLING').length
  const charging = drones.filter((d) => d.mode === 'CHARGING').length
  const escorting = drones.filter((d) => d.mode === 'ESCORTING').length
  const returning = drones.filter((d) => d.mode === 'RETURNING').length
  const stations = snapshot?.stations ?? []
  const occupied = stations.reduce((total, s) => total + s.occupiedSlots, 0)
  const capacity = stations.reduce((total, s) => total + s.capacity, 0)

  return (
    <div className="pointer-events-auto flex w-56 flex-col gap-3">
      <section className={PANEL}>
        <h2 className={HEADING}>Fleet</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <dt className="text-slate-500">Drones</dt>
          <dd className="text-right font-mono text-slate-800 dark:text-slate-200">
            {drones.length}
          </dd>
          <dt className="text-slate-500">Patrolling</dt>
          <dd className="text-right font-mono text-emerald-600 dark:text-emerald-400">
            {patrolling}
          </dd>
          <dt className="text-slate-500">Charging</dt>
          <dd className="text-right font-mono text-amber-600 dark:text-amber-400">{charging}</dd>
          <dt className="text-slate-500">Returning</dt>
          <dd className="text-right font-mono text-slate-800 dark:text-slate-200">{returning}</dd>
          <dt className="text-slate-500">Escorting</dt>
          <dd className="text-right font-mono text-red-600 dark:text-red-400">{escorting}</dd>
          <dt className="text-slate-500">Pads</dt>
          <dd className="text-right font-mono text-slate-800 dark:text-slate-200">
            {occupied}/{capacity}
          </dd>
          <dt className="text-slate-500">Vehicles</dt>
          <dd className="text-right font-mono text-slate-800 dark:text-slate-200">
            {snapshot?.vehicles.length ?? 0}
          </dd>
          <dt className="text-slate-500">Link</dt>
          <dd
            className={`text-right font-mono ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {connected ? 'live' : 'down'}
          </dd>
        </dl>
      </section>

      <section className={PANEL}>
        <h2 className={HEADING}>Simulation</h2>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className={BUTTON}
            onClick={() => void postSimulationCommand('/api/simulation/pause')}
          >
            Pause
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => void postSimulationCommand('/api/simulation/start')}
          >
            Resume
          </button>
        </div>

        <button
          type="button"
          disabled={snapshot?.ambulance.active}
          onClick={() => {
            void postSimulationCommand('/api/emergency/ambulance')
            useSimulationStore.getState().setFollowAmbulance(true)
          }}
          className="mt-1.5 w-full rounded-sm border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] font-medium tracking-wide text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
          title="Simulated only. No emergency service is contacted."
        >
          Trigger ambulance
        </button>

        <button
          type="button"
          disabled={Boolean(snapshot?.sos)}
          onClick={() => setSosOpen(true)}
          className="mt-1.5 w-full rounded-sm border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] font-medium tracking-[0.18em] text-red-700 uppercase transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
          title="Simulated only. No responder is contacted."
        >
          SOS
        </button>

        <button
          type="button"
          onClick={() => {
            void postSimulationCommand('/api/simulation/overspeed/trigger')
            useSimulationStore.getState().selectDrone('DR-01')
          }}
          className="mt-1.5 w-full rounded-sm border border-amber-400 bg-amber-50 px-2 py-1.5 text-[11px] font-medium tracking-wide text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300"
          title="Spawns an overspeeding vehicle (~135 km/h) heading toward DR-01"
        >
          ⚡ Test Overspeed Vehicle
        </button>

        {Boolean(snapshot?.violationsCount) && (
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>E-Challans logged:</span>
            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
              {snapshot?.violationsCount}
            </span>
          </div>
        )}

        {/* Simulation clock. The Phase 12 thresholds are 40 and 80 SIMULATED
            minutes, so this is how a demo reaches them in seconds. */}
        <div className="mt-2">
          <p className="mb-1 text-[9px] tracking-[0.16em] text-slate-500 uppercase">
            Sim speed &middot; {snapshot?.speedMultiplier ?? 1}x
          </p>
          <div className="grid grid-cols-4 gap-1">
            {[1, 5, 10, 60].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => void postSpeed(speed)}
                className={`rounded-sm border px-1 py-0.5 text-[10px] tracking-wide transition-colors ${
                  (snapshot?.speedMultiplier ?? 1) === speed
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-sky-700/70 dark:bg-sky-500/10 dark:text-sky-200'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`${BUTTON} mt-1.5 w-full`}
          onClick={() => void postSimulationCommand('/api/simulation/reset')}
        >
          Reset simulation
        </button>
      </section>

      <SosDialog open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  )
}
