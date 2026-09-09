export type ApiConnectionStatus = 'idle' | 'checking' | 'online' | 'offline'

export type SocketConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
