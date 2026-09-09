import type { SimulationSnapshot } from '../types/simulation'
import { connectSocket, getSocket } from './socketClient'

/**
 * Simulation snapshot stream.
 *
 * Snapshots arrive at 5 Hz. Subscribers get the raw object: the 3D renderer
 * needs it without a React round-trip, and the store forwards it to the panels
 * separately.
 */
type Listener = (snapshot: SimulationSnapshot) => void

const listeners = new Set<Listener>()
let bound = false
let onConnectionChange: ((connected: boolean) => void) | undefined

/** Registers a callback for transport up/down, used by the fleet panel. */
export function setConnectionListener(listener: (connected: boolean) => void): void {
  onConnectionChange = listener
  if (getSocket().connected) {
    listener(true)
  }
}

export function subscribeToSimulation(listener: Listener): () => void {
  listeners.add(listener)

  if (!bound) {
    bound = true
    // Own the connection here. The socket is created with autoConnect:false,
    // and this is now the only consumer - the Phase 1 status panel that used
    // to open it has been removed from the command-centre header.
    const socket = connectSocket()
    socket.on('connect', () => {
      onConnectionChange?.(true)
    })
    socket.on('disconnect', () => {
      onConnectionChange?.(false)
    })
    socket.on('simulation:state', (snapshot: SimulationSnapshot) => {
      for (const entry of listeners) {
        entry(snapshot)
      }
    })
  }

  return () => {
    listeners.delete(listener)
  }
}

/** Fire-and-forget simulation control call. */
export async function postSimulationCommand(path: string): Promise<void> {
  const base = import.meta.env.VITE_API_URL?.trim() ?? 'http://localhost:4000'
  await fetch(`${base}${path}`, { method: 'POST', headers: { Accept: 'application/json' } })
}
