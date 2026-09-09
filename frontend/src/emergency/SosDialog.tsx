import { useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'

/**
 * Operational bounding box, mirroring the backend check.
 *
 * Validated client-side for a fast, specific message; the backend rejects
 * out-of-area coordinates too, so this is convenience, not the guard.
 */
const BOUNDS = { west: 77.6, south: 12.3, east: 78.45, north: 12.95 }

interface SosDialogProps {
  open: boolean
  onClose: () => void
}

/** SOS entry modal: the operator types the person's latitude and longitude. */
export function SosDialog({ open, onClose }: SosDialogProps) {
  const [latitude, setLatitude] = useState('12.66476')
  const [longitude, setLongitude] = useState('78.01063')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const applySnapshot = useSimulationStore((state) => state.applySnapshot)

  if (!open) {
    return null
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const lat = Number(latitude)
    const lon = Number(longitude)

    if (latitude.trim() === '' || longitude.trim() === '') {
      setError('Latitude and longitude are required.')
      return
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('Latitude and longitude must be numbers.')
      return
    }
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90.')
      return
    }
    if (lon < -180 || lon > 180) {
      setError('Longitude must be between -180 and 180.')
      return
    }
    if (lat < BOUNDS.south || lat > BOUNDS.north || lon < BOUNDS.west || lon > BOUNDS.east) {
      setError('Location is outside the Drone Patrol operational area.')
      return
    }

    setSubmitting(true)
    try {
      const base = import.meta.env.VITE_API_URL?.trim() ?? 'http://localhost:4000'
      const response = await fetch(`${base}/api/emergency/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      })
      const payload = (await response.json()) as { success: boolean; message: string; data?: never }
      if (!response.ok || !payload.success) {
        setError(payload.message || 'Could not start the SOS.')
        return
      }
      if (payload.data) {
        applySnapshot(payload.data)
      }
      onClose()
    } catch {
      setError('Could not reach the AEROGUARD backend.')
    } finally {
      setSubmitting(false)
    }
  }

  const field =
    'w-full rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-80 rounded-md border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-900 uppercase dark:text-slate-100">
            Drone Patrol SOS
          </h2>
          <span className="rounded-sm border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-700 uppercase dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300">
            Simulated
          </span>
        </header>

        <div className="space-y-3 px-4 py-4">
          <label className="block">
            <span className="mb-1 block text-[10px] tracking-[0.16em] text-slate-500 uppercase">
              Latitude
            </span>
            <input
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              inputMode="decimal"
              placeholder="12.66476"
              className={field}
              aria-label="Latitude"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-[0.16em] text-slate-500 uppercase">
              Longitude
            </span>
            <input
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              inputMode="decimal"
              placeholder="78.01063"
              className={field}
              aria-label="Longitude"
            />
          </label>

          <p className="text-[10px] leading-snug text-slate-500">
            The person does not have to be on NH-44, but must be inside the operational area
            around the Krishnagiri to Hosur corridor.
          </p>

          {error && (
            <p className="rounded-sm border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] leading-snug text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <footer className="flex gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-sm border border-red-300 bg-red-50 px-3 py-1.5 text-[11px] font-medium tracking-wide text-red-700 uppercase transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
          >
            {submitting ? 'Starting…' : 'Start SOS'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-slate-300 px-3 py-1.5 text-[11px] tracking-wide text-slate-600 uppercase hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
          >
            Cancel
          </button>
        </footer>
      </form>
    </div>
  )
}
