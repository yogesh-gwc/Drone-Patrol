import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

/**
 * Generates the carriageway surface texture.
 *
 * Lanes, edge lines and dashed lane dividers are painted into one small
 * repeating texture rather than built as geometry. Drawing them as meshes over
 * 50 km would cost thousands of quads for markings alone; this costs a single
 * 64 x 256 texture and no extra triangles, which is what keeps the corridor
 * cheap enough to sit alongside the Phase 5 fleet.
 *
 * The texture spans one carriageway across its width:
 *   u = 0     outer shoulder edge
 *   u = 1     median edge
 * and repeats along the corridor in v.
 */

const WIDTH_PX = 64
const LENGTH_PX = 256

/** Metres of corridor covered by one vertical repeat of the texture. */
export const TEXTURE_LENGTH_METERS = 24

export function createCarriagewayTexture(lanes: number): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH_PX
  canvas.height = LENGTH_PX
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    // Without 2D canvas the corridor still renders, just untextured.
    const fallback = new CanvasTexture(canvas)
    fallback.colorSpace = SRGBColorSpace
    return fallback
  }

  // Asphalt. Kept dark so the corridor reads against a dark basemap without
  // glowing, and slightly blue to sit with the command-centre palette.
  ctx.fillStyle = '#23282f'
  ctx.fillRect(0, 0, WIDTH_PX, LENGTH_PX)

  // Shoulders, marginally darker than the running lanes.
  const shoulderPx = Math.round(WIDTH_PX * 0.08)
  ctx.fillStyle = '#1c2026'
  ctx.fillRect(0, 0, shoulderPx, LENGTH_PX)
  ctx.fillRect(WIDTH_PX - shoulderPx, 0, shoulderPx, LENGTH_PX)

  const runningStart = shoulderPx
  const runningWidth = WIDTH_PX - shoulderPx * 2

  // Continuous edge lines at both sides of the running surface.
  ctx.fillStyle = '#c8d2dc'
  ctx.fillRect(runningStart, 0, 2, LENGTH_PX)
  ctx.fillRect(runningStart + runningWidth - 2, 0, 2, LENGTH_PX)

  // Dashed lane dividers. 60 percent mark, 40 percent gap per repeat.
  const dashLength = Math.round(LENGTH_PX * 0.36)
  const dashGap = Math.round(LENGTH_PX * 0.28)
  ctx.fillStyle = '#aab6c2'
  for (let lane = 1; lane < lanes; lane++) {
    const x = Math.round(runningStart + (runningWidth * lane) / lanes)
    for (let y = 0; y < LENGTH_PX; y += dashLength + dashGap) {
      ctx.fillRect(x, y, 1, Math.min(dashLength, LENGTH_PX - y))
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  // Only v repeats; u maps once across the carriageway width.
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  return texture
}
