import { useEffect, useRef } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import { getCameraFeeds, missionLabel, type CameraDirection } from './cameraFeeds'

/**
 * Big screen camera overlay for drone footage.
 *
 * Positioned in the central viewport area between the left navigation rail
 * and right operations rail, as designated in the command-centre console.
 *
 * Closes via:
 * 1. The top-right close button.
 * 2. Clicking anywhere outside this overlay on the screen.
 * 3. Pressing the Escape key.
 */
export function BigScreenCameraOverlay() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const snapshot = useSimulationStore((state) => state.snapshot)
  const droneCode = useSimulationStore((state) => state.selectedDroneCode)
  const followAmbulance = useSimulationStore((state) => state.followAmbulance)
  const expandedDirection = useSimulationStore((state) => state.expandedFeedDirection)
  const setExpandedDirection = useSimulationStore((state) => state.setExpandedFeedDirection)

  const drone = droneCode ? snapshot?.drones.find((d) => d.code === droneCode) : undefined

  // Close when clicking anywhere outside the overlay or pressing Escape.
  useEffect(() => {
    if (!expandedDirection) return

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Avoid closing if clicking the tile that triggered the opening
        const target = e.target as HTMLElement
        if (target.closest('[data-camera-feed-tile]')) {
          return
        }
        setExpandedDirection(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedDirection(null)
      }
    }

    // Delay binding briefly so the click that opened the overlay does not close it.
    const timer = window.setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown)
      window.addEventListener('keydown', handleKeyDown)
    }, 50)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [expandedDirection, setExpandedDirection])

  // Autoplay management for the video element inside the big screen overlay.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true

    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        video.addEventListener(
          'loadeddata',
          () => {
            video.muted = true
            void video.play().catch(() => {})
          },
          { once: true },
        )
      })
    }
  }, [expandedDirection, followAmbulance, droneCode])

  if (!expandedDirection || !drone) {
    return null
  }

  const isEscortingDrone =
    (drone.mode === 'ESCORTING' || drone.code === snapshot?.ambulance.assignedDroneCode) &&
    snapshot?.ambulance.active === true

  const showAmbulanceFeeds = followAmbulance && isEscortingDrone
  const feeds = getCameraFeeds(showAmbulanceFeeds)
  const activeFeed = feeds.find((f) => f.direction === expandedDirection) ?? feeds[0]

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute z-30 left-4 right-4 sm:left-[380px] sm:right-[310px] top-[38%] bottom-6 flex flex-col overflow-hidden rounded-lg border border-slate-300/80 bg-slate-950/95 shadow-2xl backdrop-blur-md dark:border-slate-800"
    >
      {/* Top Header Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold tracking-wider text-slate-100">
            {drone.code}
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-medium tracking-[0.16em] text-slate-300 uppercase">
            {missionLabel(drone.mode)}
          </span>

          {/* Direction toggle tabs */}
          <div className="flex rounded border border-slate-700/60 bg-slate-950/60 p-0.5">
            {(['FRONT', 'REAR'] as CameraDirection[]).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setExpandedDirection(dir)}
                className={`rounded px-2 py-0.5 text-[9px] font-medium tracking-wider uppercase transition-colors ${
                  activeFeed.direction === dir
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          <span className="flex items-center gap-1.5 rounded bg-slate-950/80 px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] text-red-400 uppercase">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Live Feed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] tracking-wider text-slate-500 uppercase sm:inline">
            Press Esc to exit
          </span>
          <button
            type="button"
            onClick={() => setExpandedDirection(null)}
            aria-label="Close big screen video"
            className="flex h-6 w-6 items-center justify-center rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>
      </header>

      {/* Main Video Display */}
      <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          key={`${activeFeed.direction}-${activeFeed.src}`}
          src={activeFeed.src}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          className="h-full w-full object-cover"
        />

        {/* HUD Telemetry Watermark */}
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2 rounded bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono tracking-wider text-slate-200 shadow backdrop-blur-sm">
          <span className="text-sky-400 font-semibold">{activeFeed.direction} CAM</span>
          <span className="text-slate-500">|</span>
          <span>ALT {drone.altitudeMeters.toFixed(0)}m</span>
          <span className="text-slate-500">|</span>
          <span>SPD {(drone.speedKmh / 3.6).toFixed(0)}m/s</span>
          <span className="text-slate-500">|</span>
          <span>BAT {drone.batteryPercentage.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}
