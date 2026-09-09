import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl'
import { Matrix4, WebGLRenderer } from 'three'
import type { CorridorRoute } from '../corridorRoute.js'
import { buildCameraProjectionMatrix, createSceneOrigin, type SceneOrigin } from './coordinateUtils.js'
import { FleetRenderer } from './FleetRenderer.js'
import { HighwayCorridor } from './HighwayCorridor.js'
import { ThreeObjectManager } from './ThreeObjectManager.js'
import { ThreeScene } from './ThreeScene.js'

export const THREE_LAYER_ID = 'aeroguard-three-layer'

export interface ThreeLayerCallbacks {
  /** Called once the renderer, scene and corridor exist. */
  onReady?: (manager: ThreeObjectManager, map: MapLibreMap, layer: ThreeLayer) => void
  onError?: (error: Error) => void
}

/**
 * MapLibre custom layer hosting the Three.js scene.
 *
 * This is a single WebGL context shared with MapLibre - the Three.js renderer
 * is constructed against `map.getCanvas()` and the context MapLibre passes to
 * `onAdd`. There is no second canvas floating over the map, so there is
 * nothing to keep in sync by hand: MapLibre renders the layer in draw order,
 * and every frame the Three.js camera projection matrix is rebuilt from
 * MapLibre's own world-to-clip matrix.
 *
 * The consequence is that zoom, pan, rotate, pitch and bearing need no
 * handling here at all. MapLibre owns the camera; objects hold geographic
 * anchors; the matrix does the rest.
 *
 * `renderingMode: '3d'` lets MapLibre depth-test the scene, so objects are
 * occluded correctly by terrain.
 */
export class ThreeLayer implements CustomLayerInterface {
  readonly id = THREE_LAYER_ID
  readonly type = 'custom' as const
  readonly renderingMode = '3d' as const

  readonly origin: SceneOrigin

  private map: MapLibreMap | null = null
  private renderer: WebGLRenderer | null = null
  private threeScene: ThreeScene | null = null
  private manager: ThreeObjectManager | null = null
  private highway: HighwayCorridor | null = null
  private fleetRenderer: FleetRenderer | null = null
  private lastFrameMs = 0
  private readonly route: CorridorRoute

  private readonly projection = new Matrix4()
  private readonly callbacks: ThreeLayerCallbacks

  /** True while something in the scene is animating and needs continuous frames. */
  private animating = false

  constructor(
    originLongitude: number,
    originLatitude: number,
    route: CorridorRoute,
    callbacks: ThreeLayerCallbacks = {},
  ) {
    this.origin = createSceneOrigin(originLongitude, originLatitude)
    this.route = route
    this.callbacks = callbacks
  }

  get objects(): ThreeObjectManager | null {
    return this.manager
  }

  /** The 3D NH-44 corridor, the primary object in the scene. */
  get corridor(): HighwayCorridor | null {
    return this.highway
  }

  /** Renderer for the drone fleet, charging stations and traffic. */
  get fleet(): FleetRenderer | null {
    return this.fleetRenderer
  }

  /**
   * Turns on continuous repainting.
   *
   * MapLibre already repaints while the camera moves, which is enough for a
   * static scene, so this stays off until something actually animates. Phase 5
   * enables it while drones are in motion.
   */
  setAnimating(animating: boolean): void {
    this.animating = animating
    if (animating) {
      this.map?.triggerRepaint()
    }
  }

  /** Asks MapLibre for one more frame, after objects moved outside a camera change. */
  requestRepaint(): void {
    this.map?.triggerRepaint()
  }

  onAdd(map: MapLibreMap, gl: WebGL2RenderingContext): void {
    try {
      this.map = map
      this.threeScene = new ThreeScene()
      this.manager = new ThreeObjectManager(this.threeScene.scene, this.origin)

      // The corridor is a single swept mesh spanning 50 km, so it is owned
      // directly rather than through ThreeObjectManager, which anchors
      // point-located objects such as the future drones.
      this.highway = new HighwayCorridor(this.route, this.origin)
      this.threeScene.scene.add(this.highway.group)

      this.fleetRenderer = new FleetRenderer(this.threeScene.scene, this.origin)
      this.lastFrameMs = performance.now()
      // The fleet is always in motion, so the layer renders continuously.
      this.setAnimating(true)

      this.renderer = new WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      })
      // MapLibre has already drawn the basemap into this framebuffer.
      this.renderer.autoClear = false

      this.callbacks.onReady?.(this.manager, map, this)
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error('Three.js initialisation failed')
      this.callbacks.onError?.(wrapped)
    }
  }

  render(_gl: WebGL2RenderingContext, options: CustomRenderMethodInput): void {
    if (!this.renderer || !this.threeScene) {
      return
    }

    buildCameraProjectionMatrix(
      this.origin,
      options.defaultProjectionData.mainMatrix,
      this.projection,
    )
    this.threeScene.camera.projectionMatrix = this.projection

    if (this.fleetRenderer) {
      // Ease toward the latest backend snapshot. Real elapsed time keeps the
      // motion frame-rate independent.
      const now = performance.now()
      const delta = (now - this.lastFrameMs) / 1000
      this.lastFrameMs = now
      this.fleetRenderer.update(delta)
    }

    // Three.js and MapLibre share the context, so hand it back in a known state.
    this.renderer.resetState()
    this.renderer.render(this.threeScene.scene, this.threeScene.camera)

    if (this.animating) {
      this.map?.triggerRepaint()
    }
  }

  onRemove(): void {
    this.fleetRenderer?.dispose()
    this.highway?.dispose()
    // Shared fleet geometry and materials are module-level singletons and are
    // deliberately NOT disposed here: a style swap removes and re-adds this
    // layer, and freeing them would leave the rebuilt meshes pointing at
    // disposed GPU resources. They live for the lifetime of the page.
    this.manager?.dispose()
    this.threeScene?.dispose()
    // Frees Three.js programs and buffers. The WebGL context belongs to
    // MapLibre and is deliberately left alive.
    this.renderer?.dispose()

    this.fleetRenderer = null
    this.highway = null
    this.manager = null
    this.threeScene = null
    this.renderer = null
    this.map = null
  }
}
