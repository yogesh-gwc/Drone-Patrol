import { MercatorCoordinate } from 'maplibre-gl'
import { Matrix4, Vector3 } from 'three'

/**
 * Geographic to Three.js coordinate conversion.
 *
 * ---------------------------------------------------------------------------
 * THE THREE SPACES
 * ---------------------------------------------------------------------------
 *
 * 1. GEOGRAPHIC - EPSG:4326, `[longitude, latitude]` plus altitude in metres.
 *    This is the project-wide convention (see `src/types/geo.ts`) and matches
 *    the MySQL SRID 4326 columns from Phase 2.
 *
 * 2. MERCATOR - MapLibre's world space. `[0, 0]` is the top-left of the
 *    mercator world and `[1, 1]` the bottom-right, so y increases SOUTHWARD.
 *    `z` is altitude in the same conformal units. The matrix MapLibre hands a
 *    custom layer (`defaultProjectionData.mainMatrix`) maps this space to clip
 *    space. `MercatorCoordinate.fromLngLat` performs the projection.
 *
 * 3. SCENE - the local Three.js frame this module defines. It is East-North-Up
 *    in METRES, centred on a fixed scene origin:
 *      +X = east, +Y = north, +Z = up.
 *
 * ---------------------------------------------------------------------------
 * WHY A LOCAL SCENE FRAME
 * ---------------------------------------------------------------------------
 *
 * Mercator units across the corridor are around 1e-7 in magnitude, which loses
 * precision in float32 shader maths and makes authoring geometry awkward. A
 * local metre-based frame anchored near the corridor centre avoids both.
 *
 * The camera matrix carries the frame back into mercator space:
 *
 *   cameraProjection = mainMatrix * translate(origin) * scale(s, -s, s)
 *
 * where `s` is the size of one metre in mercator units at the origin latitude.
 * The negative Y flips MapLibre's southward y so that +Y is north.
 *
 * ---------------------------------------------------------------------------
 * ACCURACY
 * ---------------------------------------------------------------------------
 *
 * POSITIONS ARE EXACT. `geographicToScene` projects each coordinate with
 * MapLibre's own `fromLngLat` and then expresses the result as an offset in
 * origin-metre units. Substituting into the camera matrix above recovers the
 * original mercator coordinate exactly, so no per-object error accumulates and
 * the object stays locked to its longitude/latitude at any zoom or pitch.
 *
 * SIZES carry a small error. One scene unit is exactly one metre at the origin
 * latitude only; mercator scale varies with latitude. Across this corridor
 * (12.52 to 12.73 degrees north) that is about 0.05 percent - roughly 3 mm on
 * a 5 m object - which is irrelevant visually.
 */

export interface SceneOrigin {
  /** [longitude, latitude] the scene frame is centred on. */
  readonly lngLat: readonly [number, number]
  /** Origin position in mercator units. */
  readonly mercator: MercatorCoordinate
  /** Size of one metre in mercator units, at the origin latitude. */
  readonly metersToMercatorUnits: number
}

export function createSceneOrigin(longitude: number, latitude: number): SceneOrigin {
  const mercator = MercatorCoordinate.fromLngLat([longitude, latitude], 0)
  return {
    lngLat: [longitude, latitude],
    mercator,
    metersToMercatorUnits: mercator.meterInMercatorCoordinateUnits(),
  }
}

/**
 * Converts a geographic position to scene coordinates (metres, East-North-Up).
 *
 * `altitudeMeters` is height above the WGS 84 ellipsoid, matching how MapLibre
 * treats altitude. To sit an object on the ground, add the terrain elevation
 * at that point - see `ThreeObjectManager`.
 */
export function geographicToScene(
  origin: SceneOrigin,
  longitude: number,
  latitude: number,
  altitudeMeters = 0,
  target = new Vector3(),
): Vector3 {
  const point = MercatorCoordinate.fromLngLat([longitude, latitude], altitudeMeters)
  const scale = origin.metersToMercatorUnits

  return target.set(
    (point.x - origin.mercator.x) / scale,
    // MapLibre's mercator y grows southward; negate so +Y is north.
    -(point.y - origin.mercator.y) / scale,
    (point.z - origin.mercator.z) / scale,
  )
}

/** Inverse of {@link geographicToScene}, for hit-testing and debugging. */
export function sceneToGeographic(
  origin: SceneOrigin,
  position: Vector3,
): { longitude: number; latitude: number } {
  const scale = origin.metersToMercatorUnits
  const mercator = new MercatorCoordinate(
    origin.mercator.x + position.x * scale,
    origin.mercator.y - position.y * scale,
    origin.mercator.z + position.z * scale,
  )
  const lngLat = mercator.toLngLat()
  return { longitude: lngLat.lng, latitude: lngLat.lat }
}

/**
 * Builds the Three.js camera projection matrix for a render frame.
 *
 * `mainMatrix` is MapLibre's world-to-clip matrix for the current camera, so
 * the resulting matrix inherits MapLibre's zoom, centre, pitch and bearing.
 * Three.js never owns the camera - it only follows.
 */
export function buildCameraProjectionMatrix(
  origin: SceneOrigin,
  mainMatrix: ArrayLike<number>,
  target = new Matrix4(),
): Matrix4 {
  const scale = origin.metersToMercatorUnits

  const sceneToMercator = new Matrix4()
    .makeTranslation(origin.mercator.x, origin.mercator.y, origin.mercator.z)
    .scale(new Vector3(scale, -scale, scale))

  return target.fromArray(mainMatrix).multiply(sceneToMercator)
}
