const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_URL || 'http://127.0.0.1:8000'

let lastKnownAgentState: any = {
  droneAgentStatus: 'IDLE',
  incidentAgentStatus: 'IDLE',
  activeIncidents: [],
  pendingRecommendations: [],
  recentRecommendations: [],
  auditLog: [],
  operationalReadiness: { incidentsCount: 0, pendingCount: 0 },
  config: {
    minimumBattery: 25.0,
    distanceWeight: 0.35,
    etaWeight: 0.25,
    batteryWeight: 0.20,
    missionPriorityWeight: 0.10,
    zoneWeight: 0.10,
  },
}

export async function fetchAgentState(): Promise<any> {
  try {
    const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/state`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      lastKnownAgentState = await res.json()
      return lastKnownAgentState
    }
  } catch {
    // Return cached state if python service is booting
  }
  return lastKnownAgentState
}

export async function approveRecommendation(recId: string): Promise<any> {
  const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/recommendations/${encodeURIComponent(recId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ detail: 'Failed to approve recommendation' }))) as { detail?: string }
    throw new Error(err.detail || 'Approval failed')
  }
  return res.json()
}

export async function rejectRecommendation(recId: string): Promise<any> {
  const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/recommendations/${encodeURIComponent(recId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ detail: 'Failed to reject recommendation' }))) as { detail?: string }
    throw new Error(err.detail || 'Rejection failed')
  }
  return res.json()
}

export async function approveRelayRecommendation(relayId: string): Promise<any> {
  const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/escort/relay/${encodeURIComponent(relayId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ detail: 'Failed to approve escort relay' }))) as { detail?: string }
    throw new Error(err.detail || 'Escort relay approval failed')
  }
  return res.json()
}

export async function rejectRelayRecommendation(relayId: string): Promise<any> {
  const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/escort/relay/${encodeURIComponent(relayId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ detail: 'Failed to reject escort relay' }))) as { detail?: string }
    throw new Error(err.detail || 'Escort relay rejection failed')
  }
  return res.json()
}

export async function evaluateDroneAssignment(payload: any): Promise<any> {
  const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/drone/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('Drone evaluation failed')
  }
  return res.json()
}

export async function fetchAuditLog(): Promise<any[]> {
  try {
    const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/audit`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = (await res.json()) as any[]
      return data
    }
  } catch {
    // Return cached audit entries
    return lastKnownAgentState.auditLog || []
  }
  return lastKnownAgentState.auditLog || []
}

export async function updateAgentConfig(config: any): Promise<any> {
  const res = await fetch(`${PYTHON_AGENT_URL}/api/agent/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) {
    throw new Error('Failed to update agent config')
  }
  return res.json()
}
