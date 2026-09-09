import { useMapStore } from '../store/mapStore.js'
import type { MapFailure } from './types.js'

const STAGE_LABELS: Record<MapFailure['stage'], string> = {
  configuration: 'Configuration',
  style: 'Map style',
  map: 'Map engine',
  terrain: 'Terrain',
  three: '3D layer',
}

/** Whether a failure stops the map being usable at all. */
function isBlocking(failure: MapFailure): boolean {
  return failure.stage === 'configuration' || failure.stage === 'map'
}

/**
 * Loading and error state for the map.
 *
 * A missing key or a dead map engine gets a centred blocking panel, because
 * there is nothing to look at. Everything else - a terrain gap, a style layer
 * that would not attach - is reported in a corner while the map stays usable,
 * so a partial failure never turns into a blank screen.
 */
export function MapStatusOverlay() {
  const mapStatus = useMapStore((state) => state.mapStatus)
  const failures = useMapStore((state) => state.failures)
  const clearFailures = useMapStore((state) => state.clearFailures)

  const blocking = failures.find(isBlocking)
  const advisories = failures.filter((failure) => !isBlocking(failure))

  if (blocking) {
    return (
      <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-slate-100/95 dark:bg-slate-950/92 px-6">
        <div className="max-w-lg rounded-md border border-red-300 bg-white p-6 shadow-lg dark:border-red-900/60 dark:bg-slate-900/80">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-red-400 uppercase">
            {STAGE_LABELS[blocking.stage]} error
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            The map could not be loaded
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{blocking.message}</p>
          {blocking.stage === 'configuration' && (
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <li>
                Add <code className="text-slate-900 dark:text-slate-300">VITE_MAPTILER_API_KEY=your-key</code> to{' '}
                <code className="text-slate-900 dark:text-slate-300">frontend/.env</code>.
              </li>
              <li>Restart the Vite dev server so the new value is picked up.</li>
            </ol>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {mapStatus === 'loading' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-sm border border-slate-300 bg-white/95 px-4 py-2 text-xs tracking-[0.16em] text-slate-600 uppercase shadow-sm dark:border-slate-800 dark:bg-slate-950/85 dark:text-slate-400">
            Loading corridor map
          </p>
        </div>
      )}

      {advisories.length > 0 && (
        <div className="pointer-events-auto absolute bottom-16 left-1/2 z-10 w-full max-w-md -translate-x-1/2 px-4">
          <div className="rounded-md border border-amber-300 bg-white/95 p-3 shadow-md backdrop-blur dark:border-amber-900/60 dark:bg-slate-950/90">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-700 uppercase dark:text-amber-400">
                Degraded
              </p>
              <button
                type="button"
                onClick={clearFailures}
                className="text-[10px] tracking-wide text-slate-500 uppercase hover:text-slate-800 dark:hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {advisories.map((failure) => (
                <li key={failure.stage} className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500">{STAGE_LABELS[failure.stage]}:</span>{' '}
                  {failure.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
