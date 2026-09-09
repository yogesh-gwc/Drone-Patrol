import type { Server as SocketServer } from 'socket.io'
import { fetchAgentState } from '../agents/agentClient.js'
import { logger } from '../utils/logger.js'
import { simulation } from './simulationEngine.js'

/**
 * Streams simulation snapshots and agent state to connected clients.
 *
 * The engine ticks at 20 Hz but broadcasts at 5 Hz: enough for the client to
 * interpolate smoothly, and a fifth of the network traffic.
 */
const BROADCAST_HZ = 5

let timer: NodeJS.Timeout | null = null
let broadcastTick = 0

export function startBroadcasting(io: SocketServer): void {
  if (timer) {
    return
  }
  timer = setInterval(async () => {
    if (io.engine.clientsCount === 0) {
      return
    }
    broadcastTick++
    io.emit('simulation:state', simulation.snapshot())

    // Broadcast agent state at 1 Hz (every 5th tick)
    if (broadcastTick % BROADCAST_HZ === 0) {
      try {
        const agentState = await fetchAgentState()
        io.emit('agent:state', agentState)
      } catch {
        // AI service might be offline or starting up
      }
    }
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
