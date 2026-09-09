import { useEffect, useRef, useState } from 'react'
import type { CameraFeed } from './cameraFeeds'

interface CameraFeedTileProps {
  feed: CameraFeed
  /** Set when the camera cannot be shown; the reason is displayed instead. */
  unavailable: string | null
  /** Callback when the user clicks the video tile to expand to big screen. */
  onExpand?: () => void
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
export function CameraFeedTile({ feed, unavailable, onExpand }: CameraFeedTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (unavailable) {
      return
    }
    const video = videoRef.current
    if (!video) {
      return
    }
    setFailed(false)
    video.muted = true
    video.defaultMuted = true

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

    const tryPlay = () => {
      video.muted = true
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Retry playback once metadata is loaded
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
    }

    tryPlay()

    return () => {
      video.removeEventListener('loadedmetadata', seek)
      video.pause()
    }
  }, [feed.src, feed.startSeconds, unavailable])

  const message = unavailable ?? (failed ? 'Camera feed unavailable' : null)

  return (
    <figure
      onClick={message ? undefined : onExpand}
      title={message ? undefined : 'Click to open on big screen'}
      data-camera-feed-tile="true"
      className={`group relative m-0 overflow-hidden rounded-sm border border-slate-300 bg-slate-900 transition-all dark:border-slate-800 ${
        message ? '' : 'cursor-pointer hover:border-sky-500 hover:ring-1 hover:ring-sky-500/80'
      }`}
    >
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
            preload="auto"
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

        {/* Hover hint for big screen expand */}
        {!message && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/30 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="rounded bg-slate-950/80 px-2 py-1 text-[10px] font-medium tracking-wider text-sky-300 uppercase shadow backdrop-blur-sm">
              ⤢ Big Screen
            </span>
          </div>
        )}
      </div>
    </figure>
  )
}
