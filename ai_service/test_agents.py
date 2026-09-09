from __future__ import annotations
import sys
from ai_service.models import DroneCandidate
from ai_service.tools.drone_tools import rank_candidate_drones
from ai_service.tools.incident_tools import get_vehicle_context, evaluate_stoppage_anomaly
from ai_service.graphs.drone_assignment_graph import drone_assignment_graph
from ai_service.graphs.incident_graph import incident_graph
from ai_service.graphs.escort_relay_graph import escort_relay_graph
from ai_service.audit_logger import get_audit_log, log_audit


def test_drone_ranking_exclusions():

    mock_drones = [
        {"code": "DR-01", "name": "Drone 1", "batteryPercentage": 18, "mode": "PATROLLING", "position": [78.22, 12.52]},
        {"code": "DR-02", "name": "Drone 2", "batteryPercentage": 85, "mode": "CHARGING", "stationCode": "CS-01", "position": [78.22, 12.52]},
        {"code": "DR-03", "name": "Drone 3", "batteryPercentage": 90, "mode": "ESCORTING", "position": [78.22, 12.52]},
        {"code": "DR-04", "name": "Drone 4", "batteryPercentage": 88, "mode": "PATROLLING", "zoneCode": "Z-04", "position": [78.01, 12.66]},
        {"code": "DR-05", "name": "Drone 5", "batteryPercentage": 75, "mode": "PATROLLING", "zoneCode": "Z-05", "position": [78.02, 12.67]},
    ]
    target_pos = [78.01, 12.66] # Near Shoolagiri

    candidates = rank_candidate_drones(mock_drones, target_pos, target_zone="Z-04")
    assert len(candidates) == 5, f"Expected 5 candidates, got {len(candidates)}"

    # Check disqualifications
    dr1 = next(c for c in candidates if c.droneCode == "DR-01")
    assert not dr1.eligible, "DR-01 should be ineligible due to low battery (<25%)"

    dr2 = next(c for c in candidates if c.droneCode == "DR-02")
    assert not dr2.eligible, "DR-02 should be ineligible because it is charging"

    dr3 = next(c for c in candidates if c.droneCode == "DR-03")
    assert not dr3.eligible, "DR-03 should be ineligible because it is escorting ambulance"

    # DR-04 is closest and has high battery
    assert candidates[0].droneCode == "DR-04", f"Expected DR-04 to be rank 1, got {candidates[0].droneCode}"
    assert candidates[0].eligible, "DR-04 should be eligible"
    assert candidates[0].rank == 1
    print("[PASS] Test 1: Drone candidate ranking and exclusion rules verified.")


def test_drone_assignment_langgraph():
    mock_drones = [
        {"code": "DR-06", "name": "Aeroguard DR-06", "batteryPercentage": 82, "mode": "PATROLLING", "zoneCode": "Z-06", "position": [78.01, 12.66]},
        {"code": "DR-07", "name": "Aeroguard DR-07", "batteryPercentage": 60, "mode": "PATROLLING", "zoneCode": "Z-07", "position": [77.95, 12.68]},
    ]
    state_input = {
        "target_type": "SOS",
        "target_id": "SOS-021",
        "target_position": [78.01, 12.66],
        "target_zone": "Z-06",
        "drones": mock_drones,
    }

    result = drone_assignment_graph.invoke(state_input)
    rec = result.get("recommendation")
    assert rec is not None, "Expected recommendation from LangGraph"
    assert rec.selectedDroneCode == "DR-06", f"Expected DR-06 selected, got {rec.selectedDroneCode}"
    assert rec.explanation != "", "Explanation should not be empty"
    assert len(rec.candidates) == 2, "Should evaluate 2 candidates"
    assert rec.status == "PENDING_APPROVAL", "Should default to PENDING_APPROVAL for HITL"
    print(f"[PASS] Test 2: LangGraph Drone Assignment graph returned recommendation:\n   Selected: {rec.selectedDroneCode}\n   Reason: {rec.explanation[:90]}...")


def test_incident_graph():
    mock_vehicle = {
        "code": "VH-087",
        "kind": "TRUCK",
        "stopped": True,
        "stoppedMinutes": 43.0,
        "distanceAlongMeters": 24500.0,
        "position": [78.01, 12.66],
        "laneOffsetMeters": 3.0, # Shoulder
        "yielding": False,
    }
    all_vehicles = [
        mock_vehicle,
        {"code": "VH-002", "distanceAlongMeters": 24600.0, "speedKmh": 75.0},
        {"code": "VH-003", "distanceAlongMeters": 24800.0, "speedKmh": 80.0},
    ]

    state_input = {
        "vehicle": mock_vehicle,
        "all_vehicles": all_vehicles,
    }

    result = incident_graph.invoke(state_input)
    assessment = result.get("assessment")
    assert assessment is not None, "Expected assessment from LangGraph Incident graph"
    assert assessment.vehicleCode == "VH-087"
    assert assessment.stoppedDurationMinutes == 43.0
    assert assessment.risk in ["LOW", "MEDIUM", "HIGH", "CRITICAL"], f"Expected valid risk level, got {assessment.risk}"
    assert len(assessment.whatWasInvestigated) >= 3, "Evidence checklist should be populated"
    print(f"[PASS] Test 3: LangGraph Incident graph completed assessment:\n   Risk: {assessment.risk}\n   Action: {assessment.recommendation}")


def test_audit_logging():
    log_audit(
        agent="INCIDENT_AGENT",
        event_type="TEST_EVENT",
        headline="Test incident logged",
        details="Verification detail",
        related_entity_id="VH-087",
    )
    logs = get_audit_log(10)
    assert len(logs) > 0, "Audit log should have entries"
    assert logs[0].headline == "Test incident logged"
    print("[PASS] Test 4: Audit logger tracking correctly.")


def test_escort_feasibility_and_relay():
    # Scenario A: Infeasible - 22 km to hospital, DR-01 only has 35% battery
    # DR-01 consumes 2.8% per km + 20% reserve = 81.6% required -> deficit ~46.6%
    mock_ambulance = {
        "vehicleCode": "AMB-01",
        "assignedDroneCode": "DR-01",
        "destinationName": "Hosur Government Hospital",
        "destinationChainageMeters": 42000.0,
        "distanceRemainingMeters": 22000.0,
    }
    mock_drones = [
        {"code": "DR-01", "name": "Aeroguard DR-01", "batteryPercentage": 35.0, "mode": "ESCORTING", "distanceAlongMeters": 20500.0},
        {"code": "DR-04", "name": "Aeroguard DR-04", "batteryPercentage": 88.0, "mode": "PATROLLING", "distanceAlongMeters": 35000.0},
        {"code": "DR-05", "name": "Aeroguard DR-05", "batteryPercentage": 78.0, "mode": "PATROLLING", "distanceAlongMeters": 38000.0},
    ]

    result = escort_relay_graph.invoke({"ambulance_state": mock_ambulance, "drones": mock_drones})
    assessment = result.get("assessment")
    recommendation = result.get("recommendation")

    assert assessment is not None, "Expected feasibility assessment"
    assert not assessment.feasible, "Mission should be identified as not feasible"
    assert assessment.status == "INSUFFICIENT_RANGE"
    assert assessment.deficitPercent > 0, "Deficit percentage should be > 0"
    assert assessment.recommendedRelayDroneCode in ["DR-04", "DR-05"], "Should identify relay relief drone"

    assert recommendation is not None, "Expected relay recommendation for insufficient range"
    assert recommendation.status == "PENDING_APPROVAL"
    assert recommendation.relayDroneCode in ["DR-04", "DR-05"]
    assert recommendation.relayDroneBattery >= 75.0
    assert recommendation.explanation != "", "Explanation should be generated by Gemini"

    print(f"[PASS] Test 5A: Infeasible escort correctly detected:")
    print(f"   Current Drone: {assessment.assignedDroneCode} ({assessment.droneModel}), Battery: {assessment.currentBatteryPercent}%, Required: {assessment.requiredBatteryPercent}%")
    print(f"   Relay Recommended: {recommendation.relayDroneCode} ({recommendation.relayDroneModel}) at {recommendation.relayDroneBattery}%")
    print(f"   Reasoning: {recommendation.explanation[:100]}...")

    # Scenario B: Feasible - 6 km to hospital, DR-04 has 90% battery
    mock_ambulance_b = {
        "vehicleCode": "AMB-01",
        "assignedDroneCode": "DR-04",
        "destinationName": "Hosur Government Hospital",
        "destinationChainageMeters": 42000.0,
        "distanceRemainingMeters": 6000.0,
    }
    result_b = escort_relay_graph.invoke({"ambulance_state": mock_ambulance_b, "drones": mock_drones})
    assessment_b = result_b.get("assessment")
    rec_b = result_b.get("recommendation")

    assert assessment_b is not None
    assert assessment_b.feasible, "Mission should be feasible with 90% battery and 6 km remaining"
    assert assessment_b.status == "FEASIBLE"
    assert rec_b is None, "No relay should be needed when escort is feasible"
    print(f"[PASS] Test 5B: Feasible escort verified: {assessment_b.assignedDroneCode} can complete entire journey.")


if __name__ == "__main__":
    print("\n--- Running AeroGuard 3D Agent Unit Tests ---")
    test_drone_ranking_exclusions()
    test_drone_assignment_langgraph()
    test_incident_graph()
    test_audit_logging()
    test_escort_feasibility_and_relay()
    print("\nALL AGENT TESTS PASSED SUCCESSFULLY! [OK]\n")

