import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector2,
  Vector3,
  type Material,
  type Texture,
} from 'three'
import { positionAtDistance, type CorridorRoute } from '../corridorRoute.js'
import { geographicToScene, type SceneOrigin } from './coordinateUtils.js'
import { createCarriagewayTexture, TEXTURE_LENGTH_METERS } from './highwayTexture.js'

/**
 * Procedural 3D model of the NH-44 corridor.
 *
 * The shape comes from real OSM-derived geometry (see `corridorRoute.ts`); this
 * class only extrudes it sideways into a road surface. It is built as three
 * ribbons - two carriageways plus a median - swept along the route:
 *
 *   ┌──────────────────────────┐  outer shoulder
 *   │  lane │ lane │ lane      │  carriageway A  (textured lanes + markings)
 *   │══════════════════════════│
 *   │         MEDIAN           │
 *   │══════════════════════════│
 *   │  lane │ lane │ lane      │  carriageway B
 *   └──────────────────────────┘
 *
 * Geometry cost is deliberately low: three ribbons of `route.coordinates`
 * cross-sections, with lanes, edge lines and dashed dividers supplied by a
 * repeating texture rather than by extra triangles. For the 142-vertex
 * corridor that is a few hundred triangles in total.
 *
 * Vertices live in the scene frame (East-North-Up metres, see
 * `coordinateUtils.ts`), so the corridor is geographically aligned by
 * construction and needs no per-frame work. Terrain height is applied to the
 * Z component and can be refreshed in place as DEM tiles stream in, without
 * rebuilding any geometry.
 */

/** Metres per running lane. */
const LANE_WIDTH = 3.65
/** Metres of paved shoulder outboard of each carriageway. */
const SHOULDER_WIDTH = 2.5
/** Metres between the two carriageways. */
const MEDIAN_WIDTH = 5.5
/**
 * Metres the surface is lifted above the sampled terrain.
 *
 * Lifted slightly higher to eliminate DEM terrain z-fighting, hill clipping,
 * and broken road segments over undulating topography.
 */
const SURFACE_LIFT = 2.8

/**
 * Spacing of the resampled road centreline, in metres.
 *
 * High-density resampling (15m) contours closely to rolling terrain without
 * hillside ridges cutting through the road ribbon.
 */
const CENTRELINE_SPACING_M = 15
/**
 * The median sits fractionally below the running surface.
 *
 * Enough to read as a separating strip, small enough not to look like a
 * trench between two decks.
 */
const MEDIAN_DROP = 0.12

interface Ribbon {
  mesh: Mesh
  geometry: BufferGeometry
  /** Lateral offsets, in metres from the route centreline, for each edge. */
  offsets: [number, number]
  /** Height above sampled terrain for this ribbon. */
  lift: number
}

export interface HighwayCorridorStats {
  vertexCount: number
  triangleCount: number
  lengthMeters: number
  totalWidthMeters: number
}

export class HighwayCorridor {
  readonly group = new Group()

  private readonly route: CorridorRoute
  private readonly origin: SceneOrigin
  private readonly ribbons: Ribbon[] = []
  private readonly materials: Material[] = []
  private readonly textures: Texture[] = []

  /** Resampled centreline positions in geographic space, for terrain sampling. */
  private readonly centreLngLat: [number, number][] = []
  /** Cumulative distance at each resampled vertex, for texture mapping. */
  private readonly centreDistance: number[] = []
  /** Scene-space centreline, and the unit normal (east/north) at each vertex. */
  private readonly centre: Vector3[] = []
  private readonly normals: Vector2[] = []
  /** Terrain height in metres sampled at each centreline vertex. */
  private readonly ground: number[] = []

  constructor(route: CorridorRoute, origin: SceneOrigin) {
    this.route = route
    this.origin = origin

    this.buildCentreline()

    const lanes = route.lanesPerCarriageway
    const carriagewayWidth = lanes * LANE_WIDTH + SHOULDER_WIDTH * 2
    const half = MEDIAN_WIDTH / 2

    const texture = createCarriagewayTexture(lanes)
    this.textures.push(texture)

    // Carriageway A: median edge outward to the left of travel.
    this.addRibbon([-(half + carriagewayWidth), -half], SURFACE_LIFT, texture, carriagewayWidth)
    // Carriageway B: mirrored on the other side of the median.
    this.addRibbon([half, half + carriagewayWidth], SURFACE_LIFT, texture, carriagewayWidth, true)
    // Median.
    this.addRibbon([-half, half], SURFACE_LIFT - MEDIAN_DROP, null, MEDIAN_WIDTH)

    this.applyPositions()
  }

  get stats(): HighwayCorridorStats {
    let vertexCount = 0
    let triangleCount = 0
    for (const ribbon of this.ribbons) {
      vertexCount += ribbon.geometry.getAttribute('position').count
      triangleCount += (ribbon.geometry.getIndex()?.count ?? 0) / 3
    }
    return {
      vertexCount,
      triangleCount,
      lengthMeters: this.route.lengthMeters,
      totalWidthMeters: this.route.lanesPerCarriageway * LANE_WIDTH * 2 + SHOULDER_WIDTH * 4 + MEDIAN_WIDTH,
    }
  }

  /**
   * Re-samples terrain under the corridor and rewrites vertex heights.
   *
   * Called as DEM tiles arrive. Only the Z components of existing position
   * buffers change - no geometry, material or texture is recreated.
   *
   * @returns true when any height changed, so the caller can request a repaint.
   */
  updateTerrain(map: MapLibreMap): boolean {
    let changed = false
    const sampled: (number | null)[] = []

    for (let i = 0; i < this.centreLngLat.length; i++) {
      const elevation = map.queryTerrainElevation(this.centreLngLat[i]!)
      sampled.push(elevation)
    }

    let firstValid: number | null = null
    for (const val of sampled) {
      if (val !== null) {
        firstValid = val
        break
      }
    }

    if (firstValid === null) {
      return false
    }

    // Interpolate across missing / un-streamed DEM vertices so the road never drops to 0
    let lastValid = firstValid
    for (let i = 0; i < sampled.length; i++) {
      if (sampled[i] !== null) {
        lastValid = sampled[i]!
      } else {
        let nextValid = lastValid
        for (let j = i + 1; j < sampled.length; j++) {
          if (sampled[j] !== null) {
            nextValid = sampled[j]!
            break
          }
        }
        sampled[i] = (lastValid + nextValid) / 2
      }
    }

    // Smooth heights along the corridor to prevent abrupt steps and terrain punching
    for (let i = 0; i < this.centreLngLat.length; i++) {
      const prev = sampled[Math.max(0, i - 1)]!
      const curr = sampled[i]!
      const next = sampled[Math.min(sampled.length - 1, i + 1)]!
      const smoothElevation = prev * 0.25 + curr * 0.5 + next * 0.25

      if (Math.abs(smoothElevation - this.ground[i]!) >= 0.08) {
        this.ground[i] = smoothElevation
        changed = true
      }
    }

    if (changed) {
      this.applyPositions()
    }
    return changed
  }

  dispose(): void {
    for (const ribbon of this.ribbons) {
      this.group.remove(ribbon.mesh)
      ribbon.geometry.dispose()
    }
    for (const material of this.materials) {
      material.dispose()
    }
    for (const texture of this.textures) {
      texture.dispose()
    }
    this.ribbons.length = 0
    this.materials.length = 0
    this.textures.length = 0
  }

  /**
   * Converts the route to scene coordinates and derives a lateral normal at
   * each vertex, averaging adjacent segment directions so the ribbon corners
   * stay continuous instead of pinching at bends.
   */
  private buildCentreline(): void {
    // Resample the OSM alignment at a fixed spacing. The shape is unchanged -
    // every sample is interpolated along the real polyline - but the surface
    // now has enough vertices to sit on the terrain instead of spanning it.
    const total = this.route.lengthMeters
    const steps = Math.max(2, Math.ceil(total / CENTRELINE_SPACING_M))

    for (let i = 0; i <= steps; i++) {
      const distance = Math.min(total, (total * i) / steps)
      const [lon, lat] = positionAtDistance(this.route, distance)
      this.centreLngLat.push([lon, lat])
      this.centreDistance.push(distance)
      this.centre.push(geographicToScene(this.origin, lon, lat, 0))
      this.ground.push(0)
    }

    for (let i = 0; i < this.centre.length; i++) {
      const previous = this.centre[Math.max(0, i - 1)]!
      const next = this.centre[Math.min(this.centre.length - 1, i + 1)]!
      let dx = next.x - previous.x
      let dy = next.y - previous.y
      const length = Math.hypot(dx, dy)
      if (length < 1e-6) {
        dx = 1
        dy = 0
      } else {
        dx /= length
        dy /= length
      }
      // Left-hand normal of the direction of travel.
      this.normals.push(new Vector2(-dy, dx))
    }
  }

  private addRibbon(
    offsets: [number, number],
    lift: number,
    texture: Texture | null,
    widthMeters: number,
    mirrorU = false,
  ): void {
    const count = this.centre.length
    const positions = new Float32Array(count * 2 * 3)
    const uvs = new Float32Array(count * 2 * 2)
    const indices: number[] = []

    const uLeft = mirrorU ? 1 : 0
    const uRight = mirrorU ? 0 : 1

    for (let i = 0; i < count; i++) {
      const v = this.centreDistance[i]! / TEXTURE_LENGTH_METERS
      uvs[i * 4 + 0] = uLeft
      uvs[i * 4 + 1] = v
      uvs[i * 4 + 2] = uRight
      uvs[i * 4 + 3] = v

      if (i < count - 1) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
    geometry.setIndex(indices)

    const material = new MeshStandardMaterial(
      texture
        ? {
            map: texture,
            roughness: 0.92,
            metalness: 0.02,
            side: DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          }
        : // Median: unpainted, slightly greener than asphalt.
          {
            color: 0x2a3128,
            roughness: 0.95,
            metalness: 0.0,
            side: DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          },
    )
    if (texture) {
      // One texture instance is shared, so the repeat is set per material via
      // a clone to keep the median and carriageways independent.
      material.map = texture
    }
    this.materials.push(material)

    const mesh = new Mesh(geometry, material)
    // The corridor is drawn after the basemap; disable frustum culling checks
    // against a bounding sphere that spans 50 km and would rarely help.
    mesh.frustumCulled = false
    mesh.renderOrder = texture ? 1 : 0
    this.group.add(mesh)

    this.ribbons.push({ mesh, geometry, offsets, lift })
    void widthMeters
  }

  /** Writes centreline + lateral offset + terrain height into every ribbon. */
  private applyPositions(): void {
    for (const ribbon of this.ribbons) {
      const attribute = ribbon.geometry.getAttribute('position') as BufferAttribute
      const array = attribute.array as Float32Array

      for (let i = 0; i < this.centre.length; i++) {
        const c = this.centre[i]!
        const n = this.normals[i]!
        const z = this.ground[i]! + ribbon.lift

        for (let edge = 0; edge < 2; edge++) {
          const offset = ribbon.offsets[edge]!
          const base = (i * 2 + edge) * 3
          array[base + 0] = c.x + n.x * offset
          array[base + 1] = c.y + n.y * offset
          array[base + 2] = z
        }
      }

      attribute.needsUpdate = true
      ribbon.geometry.computeVertexNormals()
      ribbon.geometry.computeBoundingSphere()
    }
  }
}
