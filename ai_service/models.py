from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class PositionModel(BaseModel):
    lng: float
    lat: float


class DroneStateModel(BaseModel):
    code: str
    name: str
    zoneCode: str
    distanceAlongMeters: float
    position: List[float]  # [lng, lat]
    altitudeMeters: float
    headingDegrees: float
    speedKmh: float
    batteryPercentage: float
    mode: str
    cameraStatus: str
    speakerStatus: str
    gpsStatus: str
    stationCode: Optional[str] = None
    escortingVehicleCode: Optional[str] = None


class VehicleStateModel(BaseModel):
    code: str
    kind: str
    distanceAlongMeters: float
    position: List[float]  # [lng, lat]
    headingDegrees: float
    speedKmh: float
    direction: int
    laneOffsetMeters: float
    yielding: bool
    stopped: bool
    stoppedMinutes: float
    spawnSeq: int


class DroneCandidate(BaseModel):
    droneCode: str
    name: str
    battery: float
    distanceMeters: float
    etaSeconds: float
    mode: str
    zoneCode: str
    eligible: bool
    disqualificationReason: Optional[str] = None
    score: float = 0.0
    rank: int = 0
    scoreBreakdown: Dict[str, float] = Field(default_factory=dict)


class DroneAssignmentRecommendation(BaseModel):
    id: str
    targetType: Literal['SOS', 'INCIDENT', 'AMBULANCE', 'MANUAL']
    targetId: str
    targetPosition: List[float]  # [lng, lat]
    targetChainageMeters: Optional[float] = None
    selectedDroneCode: str
    candidates: List[DroneCandidate]
    explanation: str
    status: Literal['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED'] = 'PENDING_APPROVAL'
    requiresApproval: bool = True
    createdAtIso: str
    decidedAtIso: Optional[str] = None


IncidentRiskLevel = Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
IncidentState = Literal[
    'NORMAL',
    'OBSERVING',
    'POTENTIAL',
    'INVESTIGATING',
    'ASSESSED',
    'MONITORING',
    'ESCALATED',
    'RESOLVED',
]


class IncidentAssessment(BaseModel):
    incidentId: str
    vehicleCode: str
    vehicleKind: str
    stoppedDurationMinutes: float
    position: List[float]  # [lng, lat]
    chainageMeters: float
    sectorName: str
    lane: int = 0
    trafficDensity: Literal['LIGHT', 'MODERATE', 'CONGESTED'] = 'LIGHT'
    trafficImpact: Literal['LOW', 'MEDIUM', 'HIGH'] = 'LOW'
    nearbyEmergencies: bool = False
    droneObserved: bool = False
    assignedDroneCode: Optional[str] = None
    droneOnStation: bool = False
    droneDistanceMeters: float = 0.0
    risk: IncidentRiskLevel = 'LOW'
    state: IncidentState = 'NORMAL'
    whatHappened: str = ''
    whatWasInvestigated: List[str] = Field(default_factory=list)
    recommendation: str = ''
    reason: str = ''
    policeDispatchSimulated: bool = False
    startedAtIso: str
    updatedAtIso: str


class AuditEntry(BaseModel):
    id: str
    timestampIso: str
    simulatedTimeIso: str
    agent: Literal['DRONE_ASSIGNMENT_AGENT', 'INCIDENT_AGENT', 'OPERATOR', 'SYSTEM']
    type: str
    headline: str
    details: Optional[str] = None
    relatedEntityId: Optional[str] = None


class DroneSpec(BaseModel):
    droneCode: str
    name: str
    model: str
    manufacturer: str
    batteryCapacityWh: float
    maxFlightTimeMinutes: int
    maxSpeedKmh: float
    maxRangeKm: float
    consumptionRatePerKm: float
    minimumReservePercent: float
    cameraType: str
    speakerDecibels: int
    zoneCode: str


class EscortFeasibilityAssessment(BaseModel):
    ambulanceCode: str
    assignedDroneCode: str
    droneModel: str
    hospitalName: str
    distanceToHospitalMeters: float
    estimatedDurationMinutes: float
    currentBatteryPercent: float
    requiredBatteryPercent: float
    deficitPercent: float
    feasible: bool
    status: Literal['FEASIBLE', 'INSUFFICIENT_RANGE']
    depletionDistanceKm: Optional[float] = None
    reasoning: str
    recommendedRelayDroneCode: Optional[str] = None
    relayHandoffChainageMeters: Optional[float] = None


class EscortRelayRecommendation(BaseModel):
    id: str
    ambulanceCode: str
    currentDroneCode: str
    currentDroneModel: str
    currentDroneBattery: float
    relayDroneCode: str
    relayDroneModel: str
    relayDroneBattery: float
    hospitalName: str
    distanceRemainingMeters: float
    requiredBatteryPercent: float
    explanation: str
    status: Literal['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED'] = 'PENDING_APPROVAL'
    requiresApproval: bool = True
    createdAtIso: str
    decidedAtIso: Optional[str] = None


class AgentConfigModel(BaseModel):
    minimumBattery: float = 25.0
    distanceWeight: float = 0.35
    etaWeight: float = 0.25
    batteryWeight: float = 0.20
    missionPriorityWeight: float = 0.10
    zoneWeight: float = 0.10
    incidentObservingThresholdMin: float = 5.0
    incidentInvestigationThresholdMin: float = 15.0
    incidentEscalationThresholdMin: float = 60.0
    autoApproveDroneDispatch: bool = False
    autoApprovePoliceDispatch: bool = False
    autoApproveEscortRelay: bool = False
    geminiModel: str = 'gemini-2.5-flash'


class AgentStateSnapshot(BaseModel):
    droneAgentStatus: Literal['IDLE', 'EVALUATING', 'DISPATCHED'] = 'IDLE'
    incidentAgentStatus: Literal['IDLE', 'OBSERVING', 'INVESTIGATING', 'ESCALATED'] = 'IDLE'
    activeIncidents: List[IncidentAssessment] = Field(default_factory=list)
    pendingRecommendations: List[DroneAssignmentRecommendation] = Field(default_factory=list)
    recentRecommendations: List[DroneAssignmentRecommendation] = Field(default_factory=list)
    activeEscortFeasibility: Optional[EscortFeasibilityAssessment] = None
    pendingRelayRecommendations: List[EscortRelayRecommendation] = Field(default_factory=list)
    auditLog: List[AuditEntry] = Field(default_factory=list)
    operationalReadiness: Dict[str, int] = Field(default_factory=dict)
    config: AgentConfigModel = Field(default_factory=AgentConfigModel)

