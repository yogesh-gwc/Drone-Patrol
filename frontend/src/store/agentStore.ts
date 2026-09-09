import { create } from 'zustand'
import type {
  AgentStateSnapshot,
  AuditEntry,
  DroneAssignmentRecommendation,
  EscortFeasibilityAssessment,
  EscortRelayRecommendation,
  IncidentAssessment,
} from '../types/agents'

interface AgentStoreState {
  snapshot: AgentStateSnapshot | null
  activeIncidents: IncidentAssessment[]
  pendingRecommendations: DroneAssignmentRecommendation[]
  recentRecommendations: DroneAssignmentRecommendation[]
  activeEscortFeasibility: EscortFeasibilityAssessment | null
  pendingRelayRecommendations: EscortRelayRecommendation[]
  auditLog: AuditEntry[]
  selectedIncidentId: string | null
  auditModalOpen: boolean

  applyAgentSnapshot: (snapshot: AgentStateSnapshot) => void
  setSelectedIncidentId: (id: string | null) => void
  setAuditModalOpen: (open: boolean) => void
  removePendingRecommendation: (id: string) => void
  removePendingRelayRecommendation: (id: string) => void
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  snapshot: null,
  activeIncidents: [],
  pendingRecommendations: [],
  recentRecommendations: [],
  activeEscortFeasibility: null,
  pendingRelayRecommendations: [],
  auditLog: [],
  selectedIncidentId: null,
  auditModalOpen: false,

  applyAgentSnapshot: (snapshot) =>
    set({
      snapshot,
      activeIncidents: snapshot.activeIncidents || [],
      pendingRecommendations: snapshot.pendingRecommendations || [],
      recentRecommendations: snapshot.recentRecommendations || [],
      activeEscortFeasibility: snapshot.activeEscortFeasibility || null,
      pendingRelayRecommendations: snapshot.pendingRelayRecommendations || [],
      auditLog: snapshot.auditLog || [],
    }),

  setSelectedIncidentId: (selectedIncidentId) => set({ selectedIncidentId }),
  setAuditModalOpen: (auditModalOpen) => set({ auditModalOpen }),
  removePendingRecommendation: (id) =>
    set((state) => ({
      pendingRecommendations: state.pendingRecommendations.filter((r) => r.id !== id),
    })),
  removePendingRelayRecommendation: (id) =>
    set((state) => ({
      pendingRelayRecommendations: state.pendingRelayRecommendations.filter((r) => r.id !== id),
    })),
}))

