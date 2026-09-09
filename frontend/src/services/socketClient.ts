import { io, type Socket } from 'socket.io-client'
import { env } from '../utils/env'

let socket: Socket | null = null

/**
 * Lazily creates the single shared Socket.IO client.
 *
 * Phase 1 only establishes the transport. Domain events (drone telemetry,
 * vehicle updates, alerts) are registered in later phases.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.socketUrl, {
      autoConnect: false,
      transports: ['websocket'],
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 10_000,
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const instance = getSocket()
  if (!instance.connected) {
    instance.connect()
  }
  return instance
}

export function disconnectSocket(): void {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
