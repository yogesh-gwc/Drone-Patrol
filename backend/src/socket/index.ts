import type { Server as HttpServer } from 'node:http'
import { Server as SocketServer } from 'socket.io'
import { simulation } from '../simulation/simulationEngine.js'
import { env } from '../utils/env.js'
import { logger } from '../utils/logger.js'

let io: SocketServer | null = null

/**
 * Creates the Socket.IO server and wires connection lifecycle logging.
 *
 * Phase 1 establishes the transport only. Simulation events
 * (`drone:update`, `vehicle:update`, `alert:created`, ...) are emitted from
 * the simulation layer in later phases; the backend remains the authoritative
 * owner of that state.
 */
export function initialiseSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`)
    // Prime the client so it can render before the next broadcast tick.
    socket.emit('simulation:state', simulation.snapshot())

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`)
    })
  })

  return io
}

/** Returns the running Socket.IO server, or throws if it is not initialised. */
export function getIo(): SocketServer {
  if (!io) {
    throw new Error('Socket.IO server has not been initialised')
  }
  return io
}

export async function closeSocket(): Promise<void> {
  if (io) {
    await io.close()
    io = null
  }
}
