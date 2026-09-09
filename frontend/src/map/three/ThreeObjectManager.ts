import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Object3D, Scene } from 'three'
import { BufferGeometry, Material, Mesh, Vector3 } from 'three'
import { geographicToScene, type SceneOrigin } from './coordinateUtils.js'

/** How an object's altitude is interpreted. */
export type AltitudeAnchor =
  /** Metres above the ellipsoid, ignoring terrain. */
  | 'absolute'
  /** Metres above the terrain surface at that longitude/latitude. */
  | 'terrain'

export interface GeoAnchor {
  longitude: number
  latitude: number
  altitudeMeters: number
  anchor: AltitudeAnchor
}

interface ManagedObject {
  readonly object: Object3D
  anchor: GeoAnchor
  /** Terrain elevation last resolved for this anchor, metres. */
  resolvedGroundMeters: number
}

/**
 * Owns every geographically anchored Three.js object in the scene.
 *
 * Objects are created once and then only repositioned, so nothing is rebuilt
 * during a React render. This is the seam the drone fleet, vehicles and
 * charging stations attach to in later phases: each becomes an entry here with
 * its own anchor, and moving one is a position write rather than a scene
 * rebuild.
 */
export class ThreeObjectManager {
  private readonly objects = new Map<string, ManagedObject>()
  private readonly scratch = new Vector3()
  private readonly scene: Scene
  private readonly origin: SceneOrigin

  constructor(scene: Scene, origin: SceneOrigin) {
    this.scene = scene
    this.origin = origin
  }

  /** Adds an object at a geographic position. Replaces any object with the same id. */
  add(id: string, object: Object3D, anchor: GeoAnchor): void {
    this.remove(id)
    const managed: ManagedObject = { object, anchor, resolvedGroundMeters: 0 }
    this.objects.set(id, managed)
    this.scene.add(object)
    this.applyPosition(managed)
  }

  /** Moves an existing object. Cheap enough to call at telemetry rate. */
  setAnchor(id: string, anchor: Partial<GeoAnchor>): void {
    const managed = this.objects.get(id)
    if (!managed) {
      return
    }
    managed.anchor = { ...managed.anchor, ...anchor }
    this.applyPosition(managed)
  }

  remove(id: string): void {
    const managed = this.objects.get(id)
    if (!managed) {
      return
    }
    this.scene.remove(managed.object)
    disposeObject(managed.object)
    this.objects.delete(id)
  }

  get(id: string): Object3D | undefined {
    return this.objects.get(id)?.object
  }

  get size(): number {
    return this.objects.size
  }

  /**
   * Re-resolves terrain-anchored objects against the current elevation data.
   *
   * Terrain tiles stream in after the map is ready, and `queryTerrainElevation`
   * returns null until the covering tile has loaded, so this is called again
   * whenever terrain data changes.
   *
   * @returns true if any object moved, so the caller can request a repaint.
   */
  refreshTerrainAnchors(map: MapLibreMap): boolean {
    let moved = false

    for (const managed of this.objects.values()) {
      if (managed.anchor.anchor !== 'terrain') {
        continue
      }
      const elevation = map.queryTerrainElevation([
        managed.anchor.longitude,
        managed.anchor.latitude,
      ])
      if (elevation === null || elevation === managed.resolvedGroundMeters) {
        continue
      }
      managed.resolvedGroundMeters = elevation
      this.applyPosition(managed)
      moved = true
    }

    return moved
  }

  dispose(): void {
    for (const id of [...this.objects.keys()]) {
      this.remove(id)
    }
  }

  private applyPosition(managed: ManagedObject): void {
    const { longitude, latitude, altitudeMeters, anchor } = managed.anchor
    const altitude =
      anchor === 'terrain' ? managed.resolvedGroundMeters + altitudeMeters : altitudeMeters

    geographicToScene(this.origin, longitude, latitude, altitude, this.scratch)
    managed.object.position.copy(this.scratch)
  }
}

/** Frees geometry and material for an object and everything under it. */
function disposeObject(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const geometry: BufferGeometry | undefined = child.geometry
    geometry?.dispose()

    const material: Material | Material[] | undefined = child.material
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.dispose()
      }
    } else {
      material?.dispose()
    }
  })
}
