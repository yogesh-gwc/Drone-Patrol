import type { Server as SocketServer } from 'socket.io'
import { logger } from '../utils/logger.js'
import { simulation } from './simulationEngine.js'

/**
 * Streams simulation snapshots to connected clients.
 *
 * The engine ticks at 20 Hz but broadcasts at 5 Hz: enough for the client to
 * interpolate smoothly, and a fifth of the network traffic. Nothing is emitted
 * while the simulation is idle and no client is listening.
 */
const BROADCAST_HZ = 5

let timer: NodeJS.Timeout | null = null

export function startBroadcasting(io: SocketServer): void {
  if (timer) {
    return
  }
  timer = setInterval(() => {
    if (io.engine.clientsCount === 0) {
      return
    }
    io.emit('simulation:state', simulation.snapshot())
  }, 1000 / BROADCAST_HZ)
  timer.unref?.()
  logger.info(`Simulation broadcast started at ${BROADCAST_HZ} Hz`)
}

export function stopBroadcasting(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
