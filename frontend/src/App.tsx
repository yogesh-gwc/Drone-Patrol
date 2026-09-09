import { useState } from 'react'
import { ThemeToggle } from './components/ThemeToggle'
import { DroneCameraPanel } from './dashboard/DroneCameraPanel'
import { HomeDashboard } from './dashboard/home/HomeDashboard'
import { DronePanel } from './dashboard/DronePanel'
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

/**
 * Application shell.
 *
 * The map fills the viewport and every panel floats over it, so the geography
 * stays the dominant element. Panels are `pointer-events-none` containers with
 * `pointer-events-auto` children, letting the map be dragged through the gaps
 * between them.
 *
 * The home dashboard is an OVERLAY, not a route. `MapScene` is mounted once
 * and never unmounted, so minimising the dashboard reveals the running
 * corridor rather than rebuilding it: the MapLibre map, the camera position,
 * the Three.js scene and the Socket.IO stream all survive the toggle
 * untouched.
 */
export default function App() {
  // The dashboard is the landing view; the operator can drop it to work the
  // full-width map and bring it back at any time.
  const [dashboardOpen, setDashboardOpen] = useState(true)

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-slate-950">
      <header className="z-30 flex shrink-0 items-center justify-between gap-4 border-b border-slate-300 bg-white px-5 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-[0.2em] text-slate-900 uppercase dark:text-slate-100">
            Drone Patrol
          </h1>
          <span className="text-[11px] tracking-wider text-slate-500 uppercase dark:text-slate-500">
            Krishnagiri &rarr; Hosur Corridor
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!dashboardOpen && (
            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              className="rounded-sm border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] text-indigo-700 uppercase transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            >
              Open dashboard
            </button>
          )}
          <AmbulanceTracker />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <MapScene />
        <MapStatusOverlay />

        {/*
          Home dashboard overlay. Occupies the left of the viewport so the 3D
          corridor stays visible beside and behind it - a full-screen dashboard
          would hide the very thing the system monitors.
        */}
        {dashboardOpen && (
          <div className="pointer-events-none absolute top-4 bottom-4 left-4 z-30 flex gap-3">
            <HomeDashboard onMinimize={() => setDashboardOpen(false)} />
          </div>
        )}

        {/*
          Left rail: view presets, corridor navigation and fleet operations.
          Yields to the dashboard, which occupies the same edge; minimising the
          dashboard brings these straight back with no map reload.
        */}
        {!dashboardOpen && (
          <div className="pointer-events-none absolute top-4 bottom-4 left-4 z-10 flex gap-3 overflow-y-auto">
            <MapControls />
            <OperationsPanel />
          </div>
        )}

        {/*
          Right rail. Everything status-related lives in one scrolling column
          on the right so the map itself is never covered: the emergency
          banners used to float over the centre of the viewport, which hid the
          very corridor the operator was trying to watch. It starts below the
          MapLibre zoom cluster in the same corner.

          The rail takes pointer events itself rather than only passing them to
          its panels. It has to scroll - with an emergency running it carries
          the banner, the speaker alert, the roster and a live camera panel -
          and a pointer-events-none container cannot be scrolled to.
        */}
        <div className="pointer-events-auto absolute top-32 right-4 bottom-12 z-20 flex w-72 flex-col gap-3 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
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
