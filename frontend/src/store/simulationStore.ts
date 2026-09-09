import { create } from 'zustand'
import type { CameraDirection } from '../dashboard/cameraFeeds'
import type { SimulationSnapshot } from '../types/simulation'

/**
 * A backwards tick jump larger than this means the backend restarted and
 * began counting again, rather than a packet arriving out of order.
 */
const RESTART_TICK_DROP = 100

/**
 * Latest simulation snapshot from the backend.
 *
 * The 3D scene does NOT read from here every frame - it subscribes to the raw
 * snapshot stream directly (see `FleetRenderer`) and interpolates. This store
 * exists for the React panels, which re-render at snapshot rate (5 Hz) rather
 * than frame rate.
 */
interface SimulationStoreState {
  snapshot: SimulationSnapshot | null
  connected: boolean
  selectedDroneCode: string | null
  selectedStationCode: string | null
  selectedVehicleCode: string | null
  /** True while the camera is locked on the ambulance. */
  followAmbulance: boolean
  /** Active camera direction expanded into the big screen overlay, or null. */
  expandedFeedDirection: CameraDirection | null

  applySnapshot: (snapshot: SimulationSnapshot) => void
  setConnected: (connected: boolean) => void
  selectDrone: (code: string | null) => void
  selectStation: (code: string | null) => void
  selectVehicle: (code: string | null) => void
  setFollowAmbulance: (following: boolean) => void
  setExpandedFeedDirection: (direction: CameraDirection | null) => void
}

export const useSimulationStore = create<SimulationStoreState>((set) => ({
  snapshot: null,
  connected: false,
  selectedDroneCode: null,
  selectedStationCode: null,
  selectedVehicleCode: null,
  followAmbulance: false,
  expandedFeedDirection: null,

  applySnapshot: (snapshot) =>
    set((state) => {
      if (!state.snapshot) {
        return { snapshot }
      }
      // Discard frames that arrive out of order...
      if (snapshot.tick >= state.snapshot.tick) {
        return { snapshot }
      }
      // ...but a large backwards jump is the backend having restarted, not a
      // late packet. Rejecting those froze the whole UI permanently: every
      // subsequent tick was lower than the one held from before the restart,
      // so panels kept rendering stale state for ever.
      return snapshot.tick < state.snapshot.tick - RESTART_TICK_DROP ? { snapshot } : state
    }),
  setConnected: (connected) => set({ connected }),
  // Only one thing is inspected at a time, so selecting clears the others.
  selectDrone: (selectedDroneCode) =>
    set((state) => ({
      selectedDroneCode,
      selectedStationCode: null,
      selectedVehicleCode: null,
      // Picking a different drone detaches ambulance camera tracking; picking
      // the escort drone itself keeps it, because that is still the ambulance.
      followAmbulance:
        selectedDroneCode !== null &&
        selectedDroneCode === state.snapshot?.ambulance.assignedDroneCode
          ? state.followAmbulance
          : false,
      // Clearing the selection closes the big-screen feed with it; switching
      // between drones leaves it open so the same view follows the new drone.
      expandedFeedDirection: selectedDroneCode === null ? null : state.expandedFeedDirection,
    })),
  selectStation: (selectedStationCode) =>
    set({
      selectedStationCode,
      selectedDroneCode: null,
      selectedVehicleCode: null,
      followAmbulance: false,
      expandedFeedDirection: null,
    }),
  selectVehicle: (selectedVehicleCode) =>
    set({
      selectedVehicleCode,
      selectedDroneCode: null,
      selectedStationCode: null,
      expandedFeedDirection: null,
    }),
  setFollowAmbulance: (followAmbulance) => set({ followAmbulance }),
  setExpandedFeedDirection: (expandedFeedDirection) => set({ expandedFeedDirection }),
}))
