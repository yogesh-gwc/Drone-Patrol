/**
 * GeoJSON geometry as exchanged over the API.
 *
 * COORDINATE CONVENTION (project-wide, do not mix):
 *   - Storage: MySQL POINT / LINESTRING / POLYGON with SRID 4326.
 *   - Wire format: GeoJSON per RFC 7946, so every position is [longitude, latitude].
 *   - Writing to MySQL: WKT is longitude-first and parsed with
 *     ST_GeomFromText(wkt, 4326, 'axis-order=long-lat').
 *   - Reading from MySQL: always via ST_AsGeoJSON(), which emits
 *     [longitude, latitude] regardless of the SRS axis order.
 *
 * MySQL's native axis order for SRID 4326 is latitude-first, which is why the
 * explicit axis-order option and ST_AsGeoJSON are used on every boundary
 * instead of ST_X / ST_Y.
 */

/** [longitude, latitude] */
export type Position = [number, number]

export interface GeoPoint {
  type: 'Point'
  coordinates: Position
}

export interface GeoLineString {
  type: 'LineString'
  coordinates: Position[]
}

export interface GeoPolygon {
  type: 'Polygon'
  /** First ring is the exterior boundary. */
  coordinates: Position[][]
}

export type GeoGeometry = GeoPoint | GeoLineString | GeoPolygon
