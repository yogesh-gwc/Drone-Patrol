import { useEffect, useRef, useState } from 'react'
import type { CameraFeed } from './cameraFeeds'

interface CameraFeedTileProps {
  feed: CameraFeed
  /** Set when the camera cannot be shown; the reason is displayed instead. */
  unavailable: string | null
}

/**
 * One onboard camera pane.
 *
 * Three things can go wrong with a video element on someone else's machine,
 * and none of them may take the panel down with it:
 *
 *  - the file is missing or the codec is unsupported (`onError`)
 *  - the browser blocks autoplay, even muted (`play()` rejects)
 *  - the drone has no camera to show at all (charging, offline)
 *
 * Each falls back to a readable placeholder rather than a dead black square.
 */
export function CameraFeedTile({ feed, unavailable }: CameraFeedTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [failed, setFailed] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (unavailable) {
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }
    setFailed(false)
    setBlocked(false)

    // Start the rear pane part-way in so the two panes are never showing the
    // same frame. Guarded: seeking past the end leaves some browsers stalled.
    const seek = () => {
      if (feed.startSeconds > 0 && Number.isFinite(video.duration)) {
        video.currentTime = feed.startSeconds % Math.max(1, video.duration)
      }
    }
    if (video.readyState >= 1) {
      seek()
    } else {
      video.addEventListener('loadedmetadata', seek, { once: true })
    }

    // Muted autoplay is normally allowed, but policies differ; a rejection is
    // reported rather than swallowed so the operator knows why it is still.
    void video.play().catch(() => setBlocked(true))

    return () => {
      video.removeEventListener('loadedmetadata', seek)
      // Stop decoding as soon as the pane goes away: ten drones' worth of
      // simultaneous streams is exactly what this panel must not create.
      video.pause()
    }
  }, [feed.src, feed.startSeconds, unavailable])

  const resume = () => {
    const video = videoRef.current
    if (!video) return
    void video
      .play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true))
  }

  const message = unavailable ?? (failed ? 'Camera feed unavailable' : null)

  return (
    <figure className="relative m-0 overflow-hidden rounded-sm border border-slate-300 bg-slate-900 dark:border-slate-800">
      <div className="relative aspect-video w-full">
        {message ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-100 px-2 text-center dark:bg-slate-900">
            <span className="text-[10px] font-medium tracking-[0.14em] text-slate-500 uppercase">
              Camera unavailable
            </span>
            <span className="text-[9px] text-slate-500">{message}</span>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={feed.src}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Direction badge, always readable over the footage. */}
        <figcaption className="absolute top-1 left-1 rounded-sm bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-medium tracking-[0.14em] text-slate-100 uppercase">
          {feed.direction}
        </figcaption>

        {!message && (
          <span className="absolute top-1 right-1 flex items-center gap-1 rounded-sm bg-slate-950/70 px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-red-300 uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            Live
          </span>
        )}

        {blocked && !message && (
          <button
            type="button"
            onClick={resume}
            className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-[10px] tracking-[0.14em] text-slate-100 uppercase"
          >
            Tap to start feed
          </button>
        )}
      </div>
    </figure>
  )
}
