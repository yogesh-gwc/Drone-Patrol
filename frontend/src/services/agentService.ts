import { useAgentStore } from '../store/agentStore'
import type { AgentStateSnapshot, AuditEntry, DroneAssignmentRecommendation } from '../types/agents'
import { getSocket } from './socketClient'

const getApiBase = () => import.meta.env.VITE_API_URL?.trim() || 'http://localhost:4000'

export async function fetchAgentState(): Promise<AgentStateSnapshot | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents/state`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const payload = await res.json()
    if (payload.success && payload.data) {
      useAgentStore.getState().applyAgentSnapshot(payload.data)
      return payload.data
    }
  } catch {
    // Service may still be initializing
  }
  return null
}

export async function approveAgentRecommendation(id: string): Promise<DroneAssignmentRecommendation | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents/recommendations/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
    if (!res.ok) return null
    const payload = await res.json()
    useAgentStore.getState().removePendingRecommendation(id)
    await fetchAgentState()
    return payload.data
  } catch {
    return null
  }
}

export async function rejectAgentRecommendation(id: string): Promise<DroneAssignmentRecommendation | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents/recommendations/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
    if (!res.ok) return null
    const payload = await res.json()
    useAgentStore.getState().removePendingRecommendation(id)
    await fetchAgentState()
    return payload.data
  } catch {
    return null
  }
}

export async function approveRelayRecommendation(id: string): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents/relay/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
    if (!res.ok) return null
    const payload = await res.json()
    useAgentStore.getState().removePendingRelayRecommendation(id)
    await fetchAgentState()
    return payload.data
  } catch {
    return null
  }
}

export async function rejectRelayRecommendation(id: string): Promise<any> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents/relay/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
    if (!res.ok) return null
    const payload = await res.json()
    useAgentStore.getState().removePendingRelayRecommendation(id)
    await fetchAgentState()
    return payload.data
  } catch {
    return null
  }
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  try {
    const res = await fetch(`${getApiBase()}/api/agents/audit`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const payload = await res.json()
    return payload.data || []
  } catch {
    return []
  }
}

export function subscribeToAgentUpdates(): () => void {
  const socket = getSocket()

  const handleAgentState = (state: AgentStateSnapshot) => {
    useAgentStore.getState().applyAgentSnapshot(state)
  }

  socket.on('agent:state', handleAgentState)

  // Immediate fetch on mount
  void fetchAgentState()

  // Periodic fallback poll (1.5s) to guarantee real-time updates across network boundaries
  const interval = setInterval(() => {
    void fetchAgentState()
  }, 1500)

  return () => {
    clearInterval(interval)
    socket.off('agent:state', handleAgentState)
  }
}

