export interface DroneCandidate {
  droneCode: string
  name: string
  battery: number
  distanceMeters: number
  etaSeconds: number
  mode: string
  zoneCode: string
  eligible: boolean
  disqualificationReason?: string | null
  score: number
  rank: number
  scoreBreakdown?: {
    distanceScore?: number
    etaScore?: number
    batteryScore?: number
    missionScore?: number
    zoneScore?: number
  }
}

export type TargetType = 'SOS' | 'INCIDENT' | 'AMBULANCE' | 'MANUAL'

export interface DroneAssignmentRecommendation {
  id: string
  targetType: TargetType
  targetId: string
  targetPosition: [number, number]
  targetChainageMeters?: number | null
  selectedDroneCode: string
  candidates: DroneCandidate[]
  explanation: string
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED'
  requiresApproval: boolean
  createdAtIso: string
  decidedAtIso?: string | null
}

export type IncidentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentLifecycleState =
  | 'NORMAL'
  | 'OBSERVING'
  | 'POTENTIAL'
  | 'INVESTIGATING'
  | 'ASSESSED'
  | 'MONITORING'
  | 'ESCALATED'
  | 'RESOLVED'

export interface IncidentAssessment {
  incidentId: string
  vehicleCode: string
  vehicleKind: string
  stoppedDurationMinutes: number
  position: [number, number]
  chainageMeters: number
  sectorName: string
  lane: number
  trafficDensity: 'LIGHT' | 'MODERATE' | 'CONGESTED'
  trafficImpact: 'LOW' | 'MEDIUM' | 'HIGH'
  nearbyEmergencies: boolean
  droneObserved: boolean
  assignedDroneCode?: string | null
  droneOnStation: boolean
  droneDistanceMeters: number
  risk: IncidentRiskLevel
  state: IncidentLifecycleState
  whatHappened: string
  whatWasInvestigated: string[]
  recommendation: string
  reason: string
  policeDispatchSimulated: boolean
  startedAtIso: string
  updatedAtIso: string
}

export interface AuditEntry {
  id: string
  timestampIso: string
  simulatedTimeIso: string
  agent: 'DRONE_ASSIGNMENT_AGENT' | 'INCIDENT_AGENT' | 'OPERATOR' | 'SYSTEM'
  type: string
  headline: string
  details?: string | null
  relatedEntityId?: string | null
}

export interface AgentConfig {
  minimumBattery: number
  distanceWeight: number
  etaWeight: number
  batteryWeight: number
  missionPriorityWeight: number
  zoneWeight: number
  incidentObservingThresholdMin: number
  incidentInvestigationThresholdMin: number
  incidentEscalationThresholdMin: number
  autoApproveDroneDispatch: boolean
  autoApprovePoliceDispatch: boolean
  geminiModel: string
}

export interface DroneSpec {
  droneCode: string
  name: string
  model: string
  manufacturer: string
  batteryCapacityWh: number
  maxFlightTimeMinutes: number
  maxSpeedKmh: number
  maxRangeKm: number
  consumptionRatePerKm: number
  minimumReservePercent: number
  cameraType: string
  speakerDecibels: number
  zoneCode: string
}

export interface EscortFeasibilityAssessment {
  ambulanceCode: string
  assignedDroneCode: string
  droneModel: string
  hospitalName: string
  distanceToHospitalMeters: number
  estimatedDurationMinutes: number
  currentBatteryPercent: number
  requiredBatteryPercent: number
  deficitPercent: number
  feasible: boolean
  status: 'FEASIBLE' | 'INSUFFICIENT_RANGE' | 'CRITICAL_DEPLETION'
  depletionDistanceKm?: number | null
  reasoning: string
  recommendedRelayDroneCode?: string | null
}

export interface EscortRelayRecommendation {
  id: string
  ambulanceCode: string
  currentDroneCode: string
  currentDroneModel: string
  currentDroneBattery: number
  relayDroneCode: string
  relayDroneModel: string
  relayDroneBattery: number
  hospitalName: string
  distanceRemainingMeters: number
  requiredBatteryPercent: number
  explanation: string
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED'
  requiresApproval: boolean
  createdAtIso: string
  decidedAtIso?: string | null
}

export interface AgentStateSnapshot {
  droneAgentStatus: 'IDLE' | 'EVALUATING' | 'DISPATCHED'
  incidentAgentStatus: 'IDLE' | 'OBSERVING' | 'INVESTIGATING' | 'ESCALATED'
  activeIncidents: IncidentAssessment[]
  pendingRecommendations: DroneAssignmentRecommendation[]
  recentRecommendations: DroneAssignmentRecommendation[]
  activeEscortFeasibility?: EscortFeasibilityAssessment | null
  pendingRelayRecommendations?: EscortRelayRecommendation[]
  auditLog: AuditEntry[]
  operationalReadiness: Record<string, number | boolean>
  config: AgentConfig
}
