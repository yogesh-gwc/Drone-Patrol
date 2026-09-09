import { useEffect, useRef, useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'

/**
 * Seconds between spoken announcements.
 *
 * The escort state is true on every one of the 5 Hz snapshots, so speaking on
 * state alone would queue hundreds of utterances. The cooldown is what makes
 * this a periodic announcement rather than a stream.
 */
const SPEAK_COOLDOWN_S = 12

const ESCORT_MESSAGE = 'Attention. Emergency vehicle approaching. Please clear the way.'

/**
 * System speaker alert.
 *
 * Speaks the ambulance warning through the operator's own device using the
 * browser's speech synthesis - there is no external audio service and no
 * audio file to ship. Nothing here contacts a real emergency service; the
 * announcement is part of the simulation.
 *
 * Speech is cancelled the moment the escort ends, so a queued utterance
 * cannot outlive the emergency it belongs to.
 */
export function SpeakerAlert() {
  const snapshot = useSimulationStore((state) => state.snapshot)
  const [muted, setMuted] = useState(false)
  const [spokenCount, setSpokenCount] = useState(0)
  const lastSpokeAt = useRef(0)

  const ambulance = snapshot?.ambulance
  const drone = ambulance?.assignedDroneCode
    ? snapshot?.drones.find((d) => d.code === ambulance.assignedDroneCode)
    : undefined

  // The speaker is live only while a drone is actually escorting a running
  // ambulance: not during the handover at the hospital, not after it clears.
  const active =
    ambulance?.active === true &&
    ambulance.stage === 'EN_ROUTE' &&
    drone?.mode === 'ESCORTING' &&
    drone.speakerStatus === 'ACTIVE'

  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) {
      return
    }
    if (!active || muted) {
      // Ending the escort must silence anything already queued.
      synth.cancel()
      return
    }

    const now = Date.now() / 1000
    if (now - lastSpokeAt.current < SPEAK_COOLDOWN_S) {
      return
    }
    lastSpokeAt.current = now

    try {
      const utterance = new SpeechSynthesisUtterance(ESCORT_MESSAGE)
      utterance.rate = 0.95
      utterance.pitch = 1
      utterance.volume = 1
      synth.speak(utterance)
      setSpokenCount((count) => count + 1)
    } catch {
      // Speech synthesis is unavailable or refused; the visual alert below
      // still carries the message.
    }
  }, [active, muted, snapshot?.tick])

  // Belt and braces: silence on unmount too.
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  if (!active) {
    return null
  }

  return (
    <div className="pointer-events-auto w-full shrink-0 rounded-md border border-red-300 bg-white/95 shadow-md backdrop-blur dark:border-red-900/60 dark:bg-slate-950/90">
      <header className="flex items-center justify-between border-b border-red-200 px-3 py-2 dark:border-red-900/50">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-red-700 uppercase dark:text-red-300">
          System speaker alert
        </p>
        <span className="rounded-sm border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] tracking-widest text-amber-700 uppercase dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300">
          Simulated
        </span>
      </header>

      <div className="px-3 py-2">
        <p className="text-[11px] leading-snug text-slate-700 italic dark:text-slate-300">
          &ldquo;{ESCORT_MESSAGE}&rdquo;
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[9px] tracking-[0.14em] text-slate-500 uppercase">
            Speaker{' '}
            <span className="font-mono text-red-600 dark:text-red-400">
              {muted ? 'MUTED' : 'ACTIVE'}
            </span>
          </span>
          <span className="font-mono text-[9px] text-slate-500">
            {spokenCount} announced &middot; every {SPEAK_COOLDOWN_S}s
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMuted(!muted)}
          className="mt-2 w-full rounded-sm border border-slate-300 px-2 py-1 text-[9px] tracking-[0.14em] text-slate-600 uppercase transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          {muted ? 'Unmute device speaker' : 'Mute device speaker'}
        </button>
      </div>
    </div>
  )
}
