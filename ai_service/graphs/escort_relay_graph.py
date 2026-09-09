from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

from ..models import EscortFeasibilityAssessment, EscortRelayRecommendation
from ..tools.escort_feasibility_tool import evaluate_escort_mission_feasibility
from ..gemini_client import generate_escort_relay_reasoning
from ..audit_logger import log_audit


class EscortRelayState(TypedDict, total=False):
    ambulance_state: Dict[str, Any]
    drones: List[Dict[str, Any]]
    feasibility_data: Dict[str, Any]
    reasoning: str
    assessment: Optional[EscortFeasibilityAssessment]
    recommendation: Optional[EscortRelayRecommendation]


def assess_feasibility_node(state: EscortRelayState) -> Dict[str, Any]:
    """Calculates drone endurance vs distance to hospital using drone specifications."""
    amb = state.get('ambulance_state', {})
    drones = state.get('drones', [])

    feasibility_data = evaluate_escort_mission_feasibility(amb, drones)
    return {'feasibility_data': feasibility_data}


def gemini_reasoning_node(state: EscortRelayState) -> Dict[str, Any]:
    """Uses Gemini to explain endurance capabilities and justify relay handoff."""
    f = state.get('feasibility_data', {})
    best_relay = f.get('best_relay_drone')

    reasoning = generate_escort_relay_reasoning(
        current_drone_code=f.get('assigned_drone_code', 'NONE'),
        current_drone_model=f.get('drone_model', 'Standard Airframe'),
        current_battery=f.get('current_battery', 0.0),
        required_battery=f.get('required_battery', 0.0),
        hospital_name=f.get('hospital_name', 'Destination Hospital'),
        distance_km=(f.get('distance_to_hospital_meters', 0.0) / 1000.0),
        depletion_km=f.get('depletion_distance_km'),
        relay_drone_code=best_relay.get('droneCode') if best_relay else None,
        relay_drone_model=best_relay.get('model') if best_relay else None,
        relay_battery=best_relay.get('battery') if best_relay else None,
    )
    return {'reasoning': reasoning}


def recommendation_node(state: EscortRelayState) -> Dict[str, Any]:
    """Builds EscortFeasibilityAssessment and EscortRelayRecommendation artifacts."""
    f = state.get('feasibility_data', {})
    reasoning = state.get('reasoning', '')
    best_relay = f.get('best_relay_drone')

    assessment = EscortFeasibilityAssessment(
        ambulanceCode=f.get('ambulance_code', 'AMB-001'),
        assignedDroneCode=f.get('assigned_drone_code', 'NONE'),
        droneModel=f.get('drone_model', 'Standard Airframe'),
        hospitalName=f.get('hospital_name', 'Hospital'),
        distanceToHospitalMeters=f.get('distance_to_hospital_meters', 0.0),
        estimatedDurationMinutes=f.get('estimated_duration_minutes', 0.0),
        currentBatteryPercent=f.get('current_battery', 0.0),
        requiredBatteryPercent=f.get('required_battery', 0.0),
        deficitPercent=f.get('deficit_percent', 0.0),
        feasible=f.get('feasible', False),
        status=f.get('status', 'INSUFFICIENT_RANGE'),
        depletionDistanceKm=f.get('depletion_distance_km'),
        reasoning=reasoning,
        recommendedRelayDroneCode=best_relay.get('droneCode') if best_relay else None,
    )

    recommendation = None
    if not assessment.feasible and best_relay:
        rec_id = f"RELAY-{uuid.uuid4().hex[:6].upper()}"
        recommendation = EscortRelayRecommendation(
            id=rec_id,
            ambulanceCode=assessment.ambulanceCode,
            currentDroneCode=assessment.assignedDroneCode,
            currentDroneModel=assessment.droneModel,
            currentDroneBattery=assessment.currentBatteryPercent,
            relayDroneCode=best_relay['droneCode'],
            relayDroneModel=best_relay['model'],
            relayDroneBattery=best_relay['battery'],
            hospitalName=assessment.hospitalName,
            distanceRemainingMeters=assessment.distanceToHospitalMeters,
            requiredBatteryPercent=assessment.requiredBatteryPercent,
            explanation=reasoning,
            status='PENDING_APPROVAL',
            requiresApproval=True,
            createdAtIso=datetime.now(timezone.utc).isoformat(),
        )

        log_audit(
            agent='DRONE_ASSIGNMENT_AGENT',
            event_type='ESCORT_RELAY_RECOMMENDED',
            headline=f"Escort relay recommended: {assessment.assignedDroneCode} -> {best_relay['droneCode']}",
            details=reasoning,
            related_entity_id=assessment.ambulanceCode,
        )
    else:
        log_audit(
            agent='DRONE_ASSIGNMENT_AGENT',
            event_type='ESCORT_FEASIBILITY_VERIFIED',
            headline=f"Escort endurance verified: {assessment.assignedDroneCode} has full capacity for {assessment.hospitalName}",
            details=f"Distance: {assessment.distanceToHospitalMeters/1000:.1f} km, Battery: {assessment.currentBatteryPercent}% (Required: {assessment.requiredBatteryPercent}%)",
            related_entity_id=assessment.assignedDroneCode,
        )

    return {
        'assessment': assessment,
        'recommendation': recommendation,
    }


def create_escort_relay_graph():
    builder = StateGraph(EscortRelayState)
    builder.add_node("assess_feasibility", assess_feasibility_node)
    builder.add_node("gemini_reasoning", gemini_reasoning_node)
    builder.add_node("recommendation", recommendation_node)

    builder.add_edge(START, "assess_feasibility")
    builder.add_edge("assess_feasibility", "gemini_reasoning")
    builder.add_edge("gemini_reasoning", "recommendation")
    builder.add_edge("recommendation", END)

    return builder.compile()


escort_relay_graph = create_escort_relay_graph()
