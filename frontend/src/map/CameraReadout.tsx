import { useMapStore } from '../store/mapStore.js'

function formatSigned(value: number): string {
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(0)}`
}

/**
 * Live camera readout.
 *
 * Doubles as the manual check that pan, zoom, rotate and pitch all reach
 * MapLibre: the numbers change as the map moves, and the marker stays on its
 * coordinate while they do.
 */
export function CameraReadout() {
  const camera = useMapStore((state) => state.camera)
  const sceneObjectCount = useMapStore((state) => state.sceneObjectCount)
  const selectedLocation = useMapStore((state) => state.selectedLocation)

  return (
    <div className="pointer-events-auto rounded-md border border-slate-300 bg-white/90 px-3 py-2 font-mono text-[10px] leading-relaxed text-slate-600 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-400">
      <div className="flex gap-4">
        <span>
          <span className="text-slate-400 dark:text-slate-600">lon </span>
          {camera.center[0].toFixed(4)}
        </span>
        <span>
          <span className="text-slate-400 dark:text-slate-600">lat </span>
          {camera.center[1].toFixed(4)}
        </span>
      </div>
      <div className="mt-0.5 flex gap-4">
        <span>
          <span className="text-slate-400 dark:text-slate-600">z </span>
          {camera.zoom.toFixed(2)}
        </span>
        <span>
          <span className="text-slate-400 dark:text-slate-600">pitch </span>
          {camera.pitch.toFixed(0)}&deg;
        </span>
        <span>
          <span className="text-slate-400 dark:text-slate-600">bearing </span>
          {formatSigned(camera.bearing)}&deg;
        </span>
      </div>
      <div className="mt-1 border-t border-slate-200 pt-1 text-slate-500 dark:border-slate-800">
        3D objects: {sceneObjectCount}
        {selectedLocation && <> &middot; selected: {selectedLocation.name}</>}
      </div>
    </div>
  )
}
