import { postSimulationCommand } from '../services/simulationSocket'
import { useSimulationStore } from '../store/simulationStore'

const MODE_TONE: Record<string, string> = {
  PATROLLING: 'text-emerald-600 dark:text-emerald-400',
  CHARGING: 'text-amber-600 dark:text-amber-400',
  ESCORTING: 'text-red-600 dark:text-red-400',
  SOS_TRACKING: 'text-red-600 dark:text-red-400',
  RETURNING: 'text-sky-600 dark:text-sky-400',
  OFFLINE: 'text-slate-400',
}

function batteryTone(level: number): string {
  if (level <= 25) return 'text-red-600 dark:text-red-400'
  if (level <= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

/**
 * Fleet roster.
 *
 * Lists every drone with its mode and battery, and lets the operator send one
 * to a charging pad or recall it. Selecting a row flies the camera to that
 * drone, which is the quickest way to answer "what is DR-07 doing".
 */
export function DronePanel() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const selectedDroneCode = useSimulationStore((state) => state.selectedDroneCode)
  const selectDrone = useSimulationStore((state) => state.selectDrone)

  const drones = snapshot?.drones ?? []
  const charging = drones.filter((d) => d.mode === 'CHARGING').length
  const stations = snapshot?.stations ?? []
  const freePads = stations.reduce((total, s) => total + (s.capacity - s.occupiedSlots), 0)

  // Selecting is enough: MapScene flies the camera and then locks onto it.
  const select = (code: string) => {
    selectDrone(code)
  }

  return (
    <div className="pointer-events-auto flex w-full shrink-0 flex-col rounded-md border border-slate-300 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
      <header className="flex shrink-0 items-baseline justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <h2 className="text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
          Drone fleet
        </h2>
        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
          {drones.length}
        </span>
      </header>

      <div className="flex shrink-0 justify-between border-b border-slate-200 px-3 py-1.5 text-[10px] text-slate-500 dark:border-slate-800">
        <span>
          Charging <span className="font-mono text-amber-600 dark:text-amber-400">{charging}</span>
        </span>
        <span>
          Free pads{' '}
          <span className="font-mono text-slate-700 dark:text-slate-300">{freePads}</span>
        </span>
      </div>

      <ul className="max-h-56 overflow-y-auto">
        {drones.map((drone) => {
          const active = drone.code === selectedDroneCode
          const isCharging = drone.mode === 'CHARGING'
          // Escorting and SOS drones are committed; the backend refuses to
          // divert them, so the control is disabled rather than failing.
          const committed = drone.mode === 'ESCORTING' || drone.mode === 'SOS_TRACKING'

          return (
            <li
              key={drone.code}
              className={`border-b border-slate-100 px-3 py-1.5 last:border-b-0 dark:border-slate-800/60 ${
                active ? 'bg-indigo-50 dark:bg-sky-500/10' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => select(drone.code)}
                  className="flex flex-1 items-baseline gap-2 text-left"
                  title={`Fly to ${drone.code}`}
                >
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {drone.code}
                  </span>
                  <span className={`text-[9px] tracking-wide uppercase ${MODE_TONE[drone.mode]}`}>
                    {drone.mode.replace('_', ' ')}
                  </span>
                </button>

                <span className={`font-mono text-[11px] ${batteryTone(drone.batteryPercentage)}`}>
                  {drone.batteryPercentage.toFixed(0)}%
                </span>

                <button
                  type="button"
                  disabled={committed || (isCharging ? false : freePads === 0)}
                  onClick={() =>
                    void postSimulationCommand(
                      `/api/drones/${drone.code}/${isCharging ? 'recall' : 'charge'}`,
                    )
                  }
                  title={
                    committed
                      ? `${drone.code} is committed to an active emergency`
                      : isCharging
                        ? `Recall ${drone.code} to patrol`
                        : `Send ${drone.code} to a charging pad`
                  }
                  className={`rounded-sm border px-1.5 py-0.5 text-[9px] tracking-wide uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    isCharging
                      ? 'border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-500/10'
                      : 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10'
                  }`}
                >
                  {isCharging ? 'Recall' : 'Charge'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
