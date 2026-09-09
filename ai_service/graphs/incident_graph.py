from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

from ..models import IncidentAssessment, DroneAssignmentRecommendation
from ..tools.incident_tools import get_vehicle_context, evaluate_stoppage_anomaly
from ..gemini_client import generate_incident_risk_reasoning
from ..audit_logger import log_audit
from ..config import get_config


class IncidentGraphState(TypedDict, total=False):
    incident_id: str
    vehicle: Dict[str, Any]
    all_vehicles: List[Dict[str, Any]]
    ambulance_state: Optional[Dict[str, Any]]
    sos_state: Optional[Dict[str, Any]]
    drone_fleet: List[Dict[str, Any]]
    active_assigned_drone: Optional[Dict[str, Any]]
    context: Dict[str, Any]
    anomaly_status: str
    assessment: Optional[IncidentAssessment]
    escalate_to_police: bool


def gather_context_node(state: IncidentGraphState) -> Dict[str, Any]:
    """Inspects vehicle kinematics, road position, surrounding traffic, and active emergencies."""
    vehicle = state.get('vehicle', {})
    all_vehicles = state.get('all_vehicles', [])
    ambulance = state.get('ambulance_state')
    sos = state.get('sos_state')
    assigned_drone = state.get('active_assigned_drone')

    ctx = get_vehicle_context(vehicle, all_vehicles, ambulance, sos)

    # Enrich with drone observation telemetry if a drone is observing
    if assigned_drone:
        from ..tools.drone_tools import meters_between
        v_pos = vehicle.get('position', [0.0, 0.0])
        d_pos = assigned_drone.get('position', [0.0, 0.0])
        dist = meters_between(d_pos, v_pos)
        ctx['droneObserved'] = True
        ctx['droneOnStation'] = dist <= 90.0
        ctx['assignedDroneCode'] = assigned_drone.get('code')
        ctx['droneDistanceMeters'] = round(dist, 1)
    else:
        ctx['droneObserved'] = False
        ctx['droneOnStation'] = False
        ctx['assignedDroneCode'] = None
        ctx['droneDistanceMeters'] = 0.0

    anomaly = evaluate_stoppage_anomaly(ctx)
    return {'context': ctx, 'anomaly_status': anomaly}


def gemini_assessment_node(state: IncidentGraphState) -> Dict[str, Any]:
    """Invokes Gemini to evaluate evidence factors, risk level, and recommendations."""
    ctx = state.get('context', {})
    incident_id = state.get('incident_id') or f"INC-{uuid.uuid4().hex[:6].upper()}"
    anomaly = state.get('anomaly_status', 'NORMAL')

    now_iso = datetime.now(timezone.utc).isoformat()
    evidence = generate_incident_risk_reasoning(ctx)

    risk_level = evidence.get('risk', 'LOW')
    if anomaly == 'NORMAL':
        incident_state = 'NORMAL'
    elif anomaly == 'POTENTIAL':
        incident_state = 'POTENTIAL'
    elif ctx.get('droneOnStation'):
        incident_state = 'ASSESSED'
    elif ctx.get('assignedDroneCode'):
        incident_state = 'INVESTIGATING'
    else:
        incident_state = 'OBSERVING'

    assessment = IncidentAssessment(
        incidentId=incident_id,
        vehicleCode=ctx.get('vehicleCode', 'VH-UNKNOWN'),
        vehicleKind=ctx.get('vehicleKind', 'CAR'),
        stoppedDurationMinutes=ctx.get('stoppedDurationMinutes', 0.0),
        position=ctx.get('position', [0.0, 0.0]),
        chainageMeters=ctx.get('chainageMeters', 0.0),
        sectorName=ctx.get('sectorName', 'NH-44'),
        lane=ctx.get('lane', 0),
        trafficDensity=ctx.get('trafficDensity', 'LIGHT'),
        trafficImpact=ctx.get('trafficImpact', 'LOW'),
        nearbyEmergencies=ctx.get('nearbyEmergencies', False),
        droneObserved=ctx.get('droneObserved', False),
        assignedDroneCode=ctx.get('assignedDroneCode'),
        droneOnStation=ctx.get('droneOnStation', False),
        droneDistanceMeters=ctx.get('droneDistanceMeters', 0.0),
        risk=risk_level,  # type: ignore
        state=incident_state,  # type: ignore
        whatHappened=evidence.get('whatHappened', ''),
        whatWasInvestigated=evidence.get('whatWasInvestigated', []),
        recommendation=evidence.get('recommendation', ''),
        reason=evidence.get('reason', ''),
        policeDispatchSimulated=False,
        startedAtIso=now_iso,
        updatedAtIso=now_iso,
    )

    return {'assessment': assessment, 'incident_id': incident_id}


def evaluate_escalation_node(state: IncidentGraphState) -> Dict[str, Any]:
    """Evaluates multi-signal criteria for simulated police dispatch escalation."""
    assessment = state.get('assessment')
    if not assessment:
        return {'escalate_to_police': False}

    duration = assessment.stoppedDurationMinutes
    risk = assessment.risk
    traffic_impact = assessment.trafficImpact
    is_shoulder = (assessment.lane == 0)

    # Multi-signal criteria
    escalate = False
    if duration >= 60.0 or risk in ['HIGH', 'CRITICAL'] or (not is_shoulder and duration >= 25.0):
        escalate = True
        assessment.state = 'ESCALATED'
        assessment.risk = 'HIGH' if duration < 80.0 else 'CRITICAL'
        assessment.recommendation = "Simulated Police Dispatch (100) recommended."

        log_audit(
            agent='INCIDENT_AGENT',
            event_type='ESCALATION_RECOMMENDED',
            headline=f"Incident {assessment.incidentId} ({assessment.vehicleCode}) escalated to HIGH/CRITICAL risk",
            details=f"Duration: {duration:.0f} min, Lane: {'Shoulder' if is_shoulder else 'Active Lane'}, Impact: {traffic_impact}. Recommendation: Simulated 100 Dispatch.",
            related_entity_id=assessment.vehicleCode,
        )

    return {'assessment': assessment, 'escalate_to_police': escalate}


# Build LangGraph StateGraph
builder = StateGraph(IncidentGraphState)
builder.add_node('gather_context', gather_context_node)
builder.add_node('gemini_assessment', gemini_assessment_node)
builder.add_node('evaluate_escalation', evaluate_escalation_node)

builder.add_edge(START, 'gather_context')
builder.add_edge('gather_context', 'gemini_assessment')
builder.add_edge('gemini_assessment', 'evaluate_escalation')
builder.add_edge('evaluate_escalation', END)

incident_graph = builder.compile()
