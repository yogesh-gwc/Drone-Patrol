import { CORRIDOR_LOCATIONS } from './corridorData.js'
import { applyViewPreset, flyToLocation } from './mapCamera.js'
import { VIEW_PRESETS } from './mapConfig.js'
import { withMap } from './mapRegistry.js'
import type { MapViewPreset } from './types.js'
import { useMapStore } from '../store/mapStore.js'

const PRESET_ORDER: MapViewPreset[] = ['overview', 'threeDimensional', 'closeUp']

/**
 * View presets and corridor navigation.
 *
 * Every button routes through `mapCamera`, and the location list is generated
 * from the corridor data, so there is no per-location camera code.
 */
export function MapControls() {
  const activePreset = useMapStore((state) => state.activePreset)
  const selectedLocation = useMapStore((state) => state.selectedLocation)
  const setActivePreset = useMapStore((state) => state.setActivePreset)
  const setSelectedLocation = useMapStore((state) => state.setSelectedLocation)
  const mapStatus = useMapStore((state) => state.mapStatus)

  const disabled = mapStatus !== 'ready'

  const handlePreset = (preset: MapViewPreset) => {
    setActivePreset(preset)
    withMap((map) => applyViewPreset(map, preset))
  }

  const handleLocate = (name: string) => {
    const location = CORRIDOR_LOCATIONS.find((entry) => entry.name === name)
    if (!location) {
      return
    }
    setSelectedLocation(location)
    withMap((map) => flyToLocation(map, location))
  }

  return (
    <div className="pointer-events-auto flex flex-col gap-3">
      <section className="rounded-md border border-slate-300 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
        <h2 className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-500">
          View
        </h2>
        <div className="flex flex-col gap-1.5">
          {PRESET_ORDER.map((preset) => {
            const definition = VIEW_PRESETS[preset]
            const isActive = activePreset === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePreset(preset)}
                disabled={disabled}
                title={definition.description}
                className={`rounded-sm border px-3 py-1.5 text-left text-xs tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-sky-700/70 dark:bg-sky-500/10 dark:text-sky-200'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-transparent dark:hover:text-slate-100'
                }`}
              >
                {definition.label}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-md border border-slate-300 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
        <h2 className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-500">
          Locate
        </h2>
        <div className="flex flex-col gap-1.5">
          {CORRIDOR_LOCATIONS.map((location) => {
            const isActive = selectedLocation?.id === location.id
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => handleLocate(location.name)}
                disabled={disabled}
                title={location.note || location.name}
                className={`flex items-center justify-between gap-3 rounded-sm border px-3 py-1.5 text-left text-xs tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-sky-700/70 dark:bg-sky-500/10 dark:text-sky-200'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-transparent dark:hover:text-slate-100'
                }`}
              >
                <span>{location.name}</span>
                {location.confidence === 'low' && (
                  <span
                    className="text-[10px] text-amber-600 dark:text-amber-400"
                    title="Geocoder matched a road of this name, not a settlement centre"
                  >
                    approx
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
