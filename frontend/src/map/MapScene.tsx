import { useEffect, useRef } from 'react'
import {
  AttributionControl,
  Map as MapLibreGL,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapSourceDataEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// Side-effect import: pins MapLibre's worker URL before any Map is created.
import './mapWorker.js'
import { setConnectionListener, subscribeToSimulation } from '../services/simulationSocket.js'
import { useMapStore } from '../store/mapStore.js'
import { useSimulationStore } from '../store/simulationStore.js'
import { useThemeStore } from '../store/themeStore.js'
import { CORRIDOR_LOCATIONS } from './corridorData.js'
import { NH44_CORRIDOR } from './corridorRoute.js'
import { fitCorridor, inspectAt } from './mapCamera.js'
import {
  CORRIDOR_CENTER,
  CORRIDOR_MAX_BOUNDS,
  MAP_LIMITS,
  mapConfig,
  styleUrlForTheme,
} from './mapConfig.js'
import { addAeroguardLayers, INTERACTIVE_LAYER_IDS } from './mapLayers.js'
import { setDebugPick, setMapInstance, setThreeLayer } from './mapRegistry.js'
import { enableTerrain } from './mapTerrain.js'
import { ThreeLayer } from './three/ThreeLayer.js'

/**
 * Click radius in screen pixels for selecting a corridor object.
 *
 * Generous on purpose. A patrolling drone covers ~22 m/s, so between the last
 * snapshot and the click landing it has already moved tens of pixels at close
 * zoom. A tight radius makes moving objects feel unclickable even when the
 * pointer is right on them.
 */
const PICK_RADIUS_PX = 70

/**
 * Owns the MapLibre map and the Three.js layer for the lifetime of the app.
 *
 * The map is created once in an effect with no reactive dependencies and torn
 * down on unmount. React state never flows into the map: instead the map
 * pushes status and camera readings into `useMapStore`, and imperative
 * commands reach it through `mapRegistry`. That keeps camera movement, terrain
 * streaming and future telemetry off the React render path.
 */
export function MapScene() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const initialStore = useMapStore.getState()

    if (!mapConfig.hasApiKey || mapConfig.styleUrl === null) {
      initialStore.setMapStatus('error')
      initialStore.addFailure({
        stage: 'configuration',
        message:
          'VITE_MAPTILER_API_KEY is not set. Add it to frontend/.env and restart the dev server.',
      })
      return
    }

    initialStore.setMapStatus('loading')

    let map: MapLibreGL
    try {
      map = new MapLibreGL({
        container,
        style: styleUrlForTheme(useThemeStore.getState().theme) ?? mapConfig.styleUrl,
        center: CORRIDOR_CENTER,
        zoom: 9.4,
        pitch: 0,
        bearing: 0,
        minZoom: MAP_LIMITS.minZoom,
        maxZoom: MAP_LIMITS.maxZoom,
        maxPitch: MAP_LIMITS.maxPitch,
        // Keeps the operator within the operational region; generous enough to
        // look around, tight enough that the corridor is never lost offscreen.
        maxBounds: CORRIDOR_MAX_BOUNDS,
        // Smooths the Three.js geometry edges; MapLibre defaults this to false.
        canvasContextAttributes: { antialias: true },
        // Replaced below with a permanently expanded control.
        attributionControl: false,
      })
    } catch (error) {
      initialStore.setMapStatus('error')
      initialStore.addFailure({
        stage: 'map',
        message: error instanceof Error ? error.message : 'MapLibre failed to initialise.',
      })
      return
    }

    setMapInstance(map)

    let unsubscribeSimulation: (() => void) | null = null

    /**
     * Camera lock on the selected drone.
     *
     * A drone patrols at ~22 m/s, so a one-shot flyTo lands where it *was* and
     * it has already left frame by the time the flight finishes - which read as
     * the map jumping somewhere unrelated. While a drone is selected the camera
     * tracks it, and any manual pan or zoom hands control straight back.
     */
    let followingDrone = false
    // Mirror the selected drone into the 3D scene so it gets a highlight ring.
    const unsubscribeSelection = useSimulationStore.subscribe((state, previous) => {
      if (state.selectedDroneCode === previous.selectedDroneCode) {
        return
      }
      threeLayerRef?.fleet?.setSelectedDrone(state.selectedDroneCode)

      // Release the lock first: a per-snapshot easeTo would otherwise interrupt
      // the inspect flight below and the zoom change would never land.
      followingDrone = false

      const code = state.selectedDroneCode
      if (!code) {
        return
      }
      const drone = state.snapshot?.drones.find((d) => d.code === code)
      if (!drone) {
        return
      }
      inspectAt(map, drone.position)
      map.once('moveend', () => {
        // Only arm if the same drone is still selected when the flight lands.
        if (useSimulationStore.getState().selectedDroneCode === code) {
          followingDrone = true
        }
      })
    })

    // Any manual gesture releases the lock, so the operator is never fighting
    // the camera.
    const releaseFollow = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) {
        followingDrone = false
      }
    }
    // Assigned below; publishCamera runs before the layer exists on first load.
    let threeLayerRef: ThreeLayer | null = null

    // --- controls ---------------------------------------------------------
    // Attribution. The MapTiler style declares both the MapTiler and
    // OpenStreetMap credits, and this control renders them from the style, so
    // no customAttribution is passed - adding one renders a duplicate line.
    // compact:false keeps it permanently visible rather than behind an info
    // button. Both providers require it; do not remove or hide it.
    map.addControl(new AttributionControl({ compact: false }), 'bottom-right')
    // visualizePitch turns the compass into a pitch and bearing readout.
    map.addControl(
      new NavigationControl({ visualizePitch: true, showZoom: true, showCompass: true }),
      'top-right',
    )
    map.addControl(new ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left')

    // --- camera readout ---------------------------------------------------
    const publishCamera = () => {
      const center = map.getCenter()
      threeLayerRef?.fleet?.setZoom(map.getZoom())
      useMapStore.getState().setCamera({
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        center: [center.lng, center.lat],
      })
    }

    // --- three.js layer ---------------------------------------------------
    const threeLayer = new ThreeLayer(CORRIDOR_CENTER[0], CORRIDOR_CENTER[1], NH44_CORRIDOR, {
      onReady: (manager, readyMap, layer) => {
        // Terrain tiles may not have arrived yet. Drape what is available now;
        // the terrain listener below refines it as tiles stream in.
        layer.corridor?.updateTerrain(readyMap)
        manager.refreshTerrainAnchors(readyMap)

        const state = useMapStore.getState()
        state.setThreeStatus('ready')
        state.setSceneObjectCount(manager.size + (layer.corridor ? 1 : 0))

        // Subscribe the 3D scene straight to the backend snapshot stream.
        // Snapshots do not pass through React: the renderer eases toward them
        // itself, so 60 fps motion costs no re-renders.
        layer.fleet?.setGroundSampler((lngLat) => readyMap.queryTerrainElevation(lngLat))
        layer.fleet?.setZoom(readyMap.getZoom())
        unsubscribeSimulation = subscribeToSimulation((snapshot) => {
          layer.fleet?.applySnapshot(snapshot)
          useSimulationStore.getState().applySnapshot(snapshot)

          if (followingDrone) {
            const code = useSimulationStore.getState().selectedDroneCode
            const drone = code ? snapshot.drones.find((d) => d.code === code) : undefined
            if (drone) {
              // Must finish inside the 200 ms snapshot interval, otherwise each
              // ease is cut short by the next one and the camera falls steadily
              // behind - very visible at raised simulation speeds.
              readyMap.easeTo({ center: drone.position, duration: 160, essential: true })
            }
          }
          const counts = layer.fleet?.counts
          if (counts) {
            useMapStore
              .getState()
              .setSceneObjectCount(counts.drones + counts.stations + counts.vehicles + 1)
          }
        })
        setConnectionListener((connected) =>
          useSimulationStore.getState().setConnected(connected),
        )
      },
      onError: (error) => {
        const state = useMapStore.getState()
        state.setThreeStatus('error')
        state.addFailure({ stage: 'three', message: error.message })
      },
    })
    threeLayerRef = threeLayer
    setThreeLayer(threeLayer)

    // --- terrain streaming ------------------------------------------------
    // Terrain-anchored objects need their ground height re-resolved as DEM
    // tiles arrive. `sourcedata` fires for every tile of every source, so the
    // work is restricted to the terrain source and coalesced into one pass per
    // animation frame - otherwise a camera flight over fresh tiles queues
    // hundreds of elevation lookups and repaint requests per second.
    let terrainRefreshQueued = false
    const refreshTerrainAnchors = () => {
      terrainRefreshQueued = false
      const corridorMoved = threeLayer.corridor?.updateTerrain(map) ?? false
      const fleetMoved = threeLayer.fleet?.refreshTerrain() ?? false
      const objectsMoved = threeLayer.objects?.refreshTerrainAnchors(map) ?? false
      if (corridorMoved || fleetMoved || objectsMoved) {
        threeLayer.requestRepaint()
      }
    }
    const queueTerrainRefresh = () => {
      if (terrainRefreshQueued) {
        return
      }
      terrainRefreshQueued = true
      requestAnimationFrame(refreshTerrainAnchors)
    }
    const handleTerrainEvent = () => {
      queueTerrainRefresh()
    }
    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === mapConfig.terrain.sourceId) {
        queueTerrainRefresh()
      }
    }

    // --- load -------------------------------------------------------------
    const handleLoad = () => {
      const state = useMapStore.getState()

      try {
        addAeroguardLayers(map)
      } catch (error) {
        state.addFailure({
          stage: 'style',
          message:
            error instanceof Error ? error.message : 'Drone Patrol map layers could not be added.',
        })
      }

      state.setTerrainStatus('loading')
      try {
        state.setTerrainStatus(enableTerrain(map) ? 'enabled' : 'disabled')
      } catch (error) {
        state.setTerrainStatus('error')
        state.addFailure({
          stage: 'terrain',
          message: error instanceof Error ? error.message : 'Terrain source failed to load.',
        })
      }

      try {
        if (!map.getLayer(threeLayer.id)) {
          map.addLayer(threeLayer)
        }
      } catch (error) {
        state.setThreeStatus('error')
        state.addFailure({
          stage: 'three',
          message:
            error instanceof Error ? error.message : 'The Three.js layer could not be added.',
        })
      }

      if (state.mapStatus !== 'ready') {
        fitCorridor(map, false)
      }
      publishCamera()
      state.setMapStatus('ready')
    }

    // --- errors -----------------------------------------------------------
    const handleError = (event: { error?: { message?: string } }) => {
      const message = event.error?.message ?? 'The map reported an unknown error.'
      const state = useMapStore.getState()
      // A DEM gap should not read as a dead basemap, so terrain failures are
      // attributed separately.
      const stage = /terrain|raster-dem|elevation/i.test(message) ? 'terrain' : 'style'
      state.addFailure({ stage, message })
      if (stage === 'terrain') {
        state.setTerrainStatus('error')
      }
    }

    // --- location interaction ---------------------------------------------
    const handleLocationClick = (event: MapLayerMouseEvent) => {
      const name = event.features?.[0]?.properties?.name
      const match = CORRIDOR_LOCATIONS.find((location) => location.name === name)
      if (match) {
        useMapStore.getState().setSelectedLocation(match)
      }
    }
    /**
     * Selects the nearest drone or charging station to the click.
     *
     * Ground-distance testing rather than a Three.js raycast: the scene camera
     * carries only a projection matrix supplied by MapLibre, with no view
     * matrix or inverse for a Raycaster to use. Comparing geographic positions
     * is cheaper and unaffected by pitch or bearing.
     */
    const handleMapClick = (event: MapLayerMouseEvent) => {
      const fleet = threeLayer.fleet
      if (!fleet) {
        return
      }
      const point: [number, number] = [event.lngLat.lng, event.lngLat.lat]
      // Pick in SCREEN space, not ground metres.
      //
      // A metre radius has to be re-derived for every zoom and still misses a
      // drone that has moved since the last snapshot. Projecting each
      // candidate and comparing pixels matches what the operator actually
      // clicked, at any zoom, pitch or bearing.
      const clickPoint = map.project(point)
      const state = useSimulationStore.getState()
      const snapshot = state.snapshot

      /**
       * Nearest candidate within the pick radius.
       *
       * Each entity type is searched separately and in priority order. A flat
       * nearest-wins search across all of them looks right but is not: a drone
       * hovering 80 m over the carriageway projects onto almost the same pixel
       * as the traffic beneath it, so a car would win by a pixel and the
       * operator would never be able to click the drone.
       */
      const nearest = <T extends { code: string; position: [number, number] }>(
        items: T[] | undefined,
      ): T | null => {
        let best: T | null = null
        let bestPixels = PICK_RADIUS_PX
        for (const item of items ?? []) {
          const projected = map.project(item.position)
          const pixels = Math.hypot(projected.x - clickPoint.x, projected.y - clickPoint.y)
          if (pixels < bestPixels) {
            bestPixels = pixels
            best = item
          }
        }
        return best
      }

      const drone = nearest(snapshot?.drones)
      if (drone) {
        // Camera movement is handled by the selection subscription so the
        // inspect flight and the follow lock stay in one place.
        state.selectDrone(drone.code)
        return
      }

      const station = nearest(snapshot?.stations)
      if (station) {
        state.selectStation(station.code)
        inspectAt(map, station.position)
        return
      }

      const vehicle = nearest(snapshot?.vehicles)
      if (vehicle) {
        state.selectVehicle(vehicle.code)
        inspectAt(map, vehicle.position)
      }
    }

    const setPointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const clearPointer = () => {
      map.getCanvas().style.cursor = ''
    }

    /**
     * Re-applies everything MapLibre discards on a style swap.
     *
     * `setStyle` drops all sources, layers and terrain, and removes custom
     * layers (running ThreeLayer.onRemove). The Three.js layer is therefore
     * rebuilt from scratch and repopulates itself from the next simulation
     * snapshot, so no scene state has to be carried across.
     */
    const unsubscribeTheme = useThemeStore.subscribe((state, previous) => {
      if (state.theme === previous.theme) {
        return
      }
      const nextStyle = styleUrlForTheme(state.theme)
      if (!nextStyle) {
        return
      }
      map.once('style.load', () => {
        handleLoad()
      })
      map.setStyle(nextStyle)
    })

    // Lets an automated run exercise selection without synthesising a click.
    setDebugPick((lngLat) => {
      const snapshot = useSimulationStore.getState().snapshot
      const click = map.project(lngLat)
      const near = (items: { code: string; position: [number, number] }[] | undefined) =>
        (items ?? [])
          .map((i) => {
            const q = map.project(i.position)
            return { code: i.code, px: Math.hypot(q.x - click.x, q.y - click.y) }
          })
          .sort((a, b) => a.px - b.px)[0]
      return {
        hasSnapshot: Boolean(snapshot),
        nearestDrone: near(snapshot?.drones),
        nearestVehicle: near(snapshot?.vehicles),
        radius: PICK_RADIUS_PX,
      }
    })

    map.on('click', handleMapClick)
    map.on('dragstart', releaseFollow)
    map.on('zoomstart', releaseFollow)
    map.on('rotatestart', releaseFollow)
    map.on('load', handleLoad)
    map.on('error', handleError)
    map.on('move', publishCamera)
    map.on('terrain', handleTerrainEvent)
    map.on('sourcedata', handleSourceData)
    for (const layerId of INTERACTIVE_LAYER_IDS) {
      map.on('click', layerId, handleLocationClick)
      map.on('mouseenter', layerId, setPointer)
      map.on('mouseleave', layerId, clearPointer)
    }

    return () => {
      map.off('click', handleMapClick)
      map.off('dragstart', releaseFollow)
      map.off('zoomstart', releaseFollow)
      map.off('rotatestart', releaseFollow)
      map.off('load', handleLoad)
      map.off('error', handleError)
      map.off('move', publishCamera)
      map.off('terrain', handleTerrainEvent)
      map.off('sourcedata', handleSourceData)
      for (const layerId of INTERACTIVE_LAYER_IDS) {
        map.off('click', layerId, handleLocationClick)
        map.off('mouseenter', layerId, setPointer)
        map.off('mouseleave', layerId, clearPointer)
      }

      // Removing the layer runs ThreeLayer.onRemove, which disposes the scene
      // geometry, materials and renderer while the GL context is still alive.
      try {
        if (map.getLayer(threeLayer.id)) {
          map.removeLayer(threeLayer.id)
        }
      } catch {
        // The style may already be gone; map.remove() below covers it.
      }

      unsubscribeSelection()
      unsubscribeTheme()
      unsubscribeSimulation?.()
      useSimulationStore.getState().setConnected(false)

      setThreeLayer(null)
      setMapInstance(null)
      map.remove()

      const state = useMapStore.getState()
      state.setMapStatus('idle')
      state.setThreeStatus('idle')
      state.setTerrainStatus('disabled')
      state.setSceneObjectCount(0)
    }
  }, [])

  // Sizing note: MapLibre adds its own `maplibregl-map` class, and
  // maplibre-gl.css declares `.maplibregl-map { position: relative }` outside
  // any cascade layer. Unlayered CSS outranks Tailwind's `@layer utilities`, so
  // an `absolute inset-0` container silently loses to that `position: relative`
  // and collapses to zero height, leaving MapLibre on its 300px fallback.
  // Filling the parent with width/height avoids the conflict entirely.
  return <div ref={containerRef} className="h-full w-full" data-testid="map-container" />
}
