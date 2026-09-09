import { create } from 'zustand'
import { ApiError } from '../services/apiClient'
import { fetchHealth } from '../services/healthService'
import { connectSocket, disconnectSocket } from '../services/socketClient'
import type { HealthData } from '../types/api'
import type { ApiConnectionStatus, SocketConnectionStatus } from '../types/connection'

interface ConnectionState {
  apiStatus: ApiConnectionStatus
  apiMessage: string | null
  apiHealth: HealthData | null
  apiCheckedAt: string | null

  socketStatus: SocketConnectionStatus
  socketId: string | null
  socketMessage: string | null

  checkBackend: () => Promise<void>
  startSocket: () => void
  stopSocket: () => void
}

/**
 * Connection state for the backend REST API and the Socket.IO transport.
 *
 * All request/transport logic lives in `services/`; components only read this
 * store and trigger its actions.
 */
export const useConnectionStore = create<ConnectionState>((set) => ({
  apiStatus: 'idle',
  apiMessage: null,
  apiHealth: null,
  apiCheckedAt: null,

  socketStatus: 'idle',
  socketId: null,
  socketMessage: null,

  checkBackend: async () => {
    set({ apiStatus: 'checking', apiMessage: null })
    try {
      const response = await fetchHealth()
      set({
        apiStatus: response.success ? 'online' : 'offline',
        apiMessage: response.message,
        apiHealth: response.data ?? null,
        apiCheckedAt: new Date().toISOString(),
      })
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Backend unreachable. Is the AEROGUARD 3D server running?'
      set({
        apiStatus: 'offline',
        apiMessage: message,
        apiHealth: null,
        apiCheckedAt: new Date().toISOString(),
      })
    }
  },

  startSocket: () => {
    set({ socketStatus: 'connecting', socketMessage: null })
    const socket = connectSocket()

    socket.on('connect', () => {
      set({ socketStatus: 'connected', socketId: socket.id ?? null, socketMessage: null })
    })

    socket.on('disconnect', (reason) => {
      set({ socketStatus: 'disconnected', socketId: null, socketMessage: reason })
    })

    socket.on('connect_error', (error) => {
      set({ socketStatus: 'error', socketId: null, socketMessage: error.message })
    })
  },

  stopSocket: () => {
    disconnectSocket()
    set({ socketStatus: 'idle', socketId: null, socketMessage: null })
  },
}))
