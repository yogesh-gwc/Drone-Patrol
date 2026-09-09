import { useEffect } from 'react'
import { ThemeToggle } from './components/ThemeToggle'
import { AgentActivityPanel } from './dashboard/AgentActivityPanel'
import { AgentAuditModal } from './dashboard/AgentAuditModal'
import { AiRecommendationCard } from './dashboard/AiRecommendationCard'
import { AmbulanceRelayCard } from './dashboard/AmbulanceRelayCard'
import { DroneCameraPanel } from './dashboard/DroneCameraPanel'
import { DronePanel } from './dashboard/DronePanel'
import { IncidentDecisionCard } from './dashboard/IncidentDecisionCard'
import { OperationsPanel } from './dashboard/OperationsPanel'
import { SelectionPanel } from './dashboard/SelectionPanel'
import { AmbulancePanel } from './emergency/AmbulancePanel'
import { AmbulanceTracker } from './emergency/AmbulanceTracker'
import { SosPanel } from './emergency/SosPanel'
import { SpeakerAlert } from './emergency/SpeakerAlert'
import { SuspiciousPanel } from './emergency/SuspiciousPanel'
import { CameraReadout } from './map/CameraReadout'
import { MapControls } from './map/MapControls'
import { MapScene } from './map/MapScene'
import { MapStatusOverlay } from './map/MapStatusOverlay'
import { subscribeToAgentUpdates } from './services/agentService'
import { useAgentStore } from './store/agentStore'

/**
 * Application shell.
 *
 * The map fills the viewport and every panel floats over it, so the geography
 * stays the dominant element. Panels are `pointer-events-none` containers with
 * `pointer-events-auto` children, letting the map be dragged through the gaps
 * between them.
 */
export default function App() {
  const setAuditModalOpen = useAgentStore((state) => state.setAuditModalOpen)
  const pendingCount = useAgentStore(
    (state) => state.pendingRecommendations.length + state.pendingRelayRecommendations.length
  )

  useEffect(() => {
    const unsubscribe = subscribeToAgentUpdates()
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-950">
      <header className="z-30 flex shrink-0 items-center justify-between gap-4 border-b border-slate-300 bg-white px-5 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-[0.2em] text-slate-900 uppercase dark:text-slate-100">
            Aeroguard 3D
          </h1>
          <span className="text-[11px] tracking-wider text-slate-500 uppercase dark:text-slate-500">
            Krishnagiri &rarr; Perandapalli &rarr; Hosur Corridor
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAuditModalOpen(true)}
            className="flex items-center gap-1.5 rounded-sm border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-medium tracking-wider text-slate-700 uppercase transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>&#128220;</span>
            <span>Audit Journal</span>
            {pendingCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <AmbulanceTracker />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <MapScene />
        <MapStatusOverlay />
        <AgentAuditModal />

        {/* Left rail: view presets, corridor navigation, fleet operations, and AI Agents. */}
        <div className="pointer-events-none absolute top-4 bottom-4 left-4 z-10 flex gap-3 overflow-y-auto">
          <MapControls />
          <div className="flex flex-col gap-3">
            <OperationsPanel />
            <AgentActivityPanel />
          </div>
        </div>

        {/*
          Right rail: AI recommendations, emergency banners, incident assessments,
          drone camera and telemetry.
        */}
        <div className="pointer-events-auto absolute top-32 right-4 bottom-12 z-20 flex w-72 flex-col gap-3 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          <AiRecommendationCard />
          <IncidentDecisionCard />
          <AmbulanceRelayCard />
          <AmbulancePanel />
          <SpeakerAlert />
          <SosPanel />
          <SuspiciousPanel />
          <DronePanel />
          <DroneCameraPanel />
          <SelectionPanel />
        </div>

        {/* Bottom-left, above MapLibre's scale bar. Development readout. */}
        <div className="pointer-events-none absolute bottom-12 left-4 z-10">
          <CameraReadout />
        </div>
      </main>
    </div>
  )
}
