import { create } from 'zustand'
import type { SimulationSnapshot } from '../types/simulation'

/**
 * Latest simulation snapshot from the backend.
 *
 * The 3D scene does NOT read from here every frame - it subscribes to the raw
 * snapshot stream directly (see `FleetRenderer`) and interpolates. This store
 * exists for the React panels, which re-render at snapshot rate (5 Hz) rather
 * than frame rate.
 */
/**
 * A backwards tick jump larger than this means the backend restarted and
 * began counting again, rather than a packet arriving out of order.
 */
const RESTART_TICK_DROP = 100

interface SimulationStoreState {
  snapshot: SimulationSnapshot | null
  connected: boolean
  selectedDroneCode: string | null
  selectedStationCode: string | null
  selectedVehicleCode: string | null
  /** True while the camera is locked on the ambulance. */
  followAmbulance: boolean

  applySnapshot: (snapshot: SimulationSnapshot) => void
  setConnected: (connected: boolean) => void
  selectDrone: (code: string | null) => void
  selectStation: (code: string | null) => void
  selectVehicle: (code: string | null) => void
  setFollowAmbulance: (following: boolean) => void
}

export const useSimulationStore = create<SimulationStoreState>((set) => ({
  snapshot: null,
  connected: false,
  selectedDroneCode: null,
  selectedStationCode: null,
  selectedVehicleCode: null,
  followAmbulance: false,

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
      // If user clicks a different drone, detach ambulance camera tracking
      followAmbulance:
        selectedDroneCode !== null &&
        selectedDroneCode === state.snapshot?.ambulance.assignedDroneCode
          ? state.followAmbulance
          : false,
    })),
  selectStation: (selectedStationCode) =>
    set({ selectedStationCode, selectedDroneCode: null, selectedVehicleCode: null, followAmbulance: false }),
  selectVehicle: (selectedVehicleCode) =>
    set({ selectedVehicleCode, selectedDroneCode: null, selectedStationCode: null }),
  setFollowAmbulance: (followAmbulance) => set({ followAmbulance }),
}))
