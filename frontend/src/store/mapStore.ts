import { create } from 'zustand'
import type {
  CorridorLocation,
  MapFailure,
  MapStatus,
  MapViewPreset,
  TerrainStatus,
  ThreeStatus,
} from '../map/types.js'

interface CameraReadout {
  zoom: number
  pitch: number
  bearing: number
  center: [number, number]
}

interface MapState {
  mapStatus: MapStatus
  threeStatus: ThreeStatus
  terrainStatus: TerrainStatus
  failures: MapFailure[]

  activePreset: MapViewPreset
  selectedLocation: CorridorLocation | null
  camera: CameraReadout
  /** Number of geographically anchored Three.js objects in the scene. */
  sceneObjectCount: number

  setMapStatus: (status: MapStatus) => void
  setThreeStatus: (status: ThreeStatus) => void
  setTerrainStatus: (status: TerrainStatus) => void
  addFailure: (failure: MapFailure) => void
  clearFailures: () => void

  setActivePreset: (preset: MapViewPreset) => void
  setSelectedLocation: (location: CorridorLocation | null) => void
  setCamera: (camera: CameraReadout) => void
  setSceneObjectCount: (count: number) => void
}

/**
 * UI-facing map state.
 *
 * Deliberately holds no MapLibre or Three.js instances. The map and the scene
 * live outside React in `MapScene`, so a state change here never rebuilds
 * them - it only re-renders the surrounding chrome.
 */
export const useMapStore = create<MapState>((set) => ({
  mapStatus: 'idle',
  threeStatus: 'idle',
  terrainStatus: 'disabled',
  failures: [],

  activePreset: 'overview',
  selectedLocation: null,
  camera: { zoom: 0, pitch: 0, bearing: 0, center: [0, 0] },
  sceneObjectCount: 0,

  setMapStatus: (mapStatus) => set({ mapStatus }),
  setThreeStatus: (threeStatus) => set({ threeStatus }),
  setTerrainStatus: (terrainStatus) => set({ terrainStatus }),

  addFailure: (failure) =>
    set((state) =>
      // Repeated tile errors are common; keep one entry per stage.
      state.failures.some((entry) => entry.stage === failure.stage)
        ? state
        : { failures: [...state.failures, failure] },
    ),
  clearFailures: () => set({ failures: [] }),

  setActivePreset: (activePreset) => set({ activePreset }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setCamera: (camera) => set({ camera }),
  setSceneObjectCount: (sceneObjectCount) => set({ sceneObjectCount }),
}))
