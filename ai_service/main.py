from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_config, update_config, BACKEND_URL, PORT, HOST
from .models import (
    AgentConfigModel,
    AgentStateSnapshot,
    DroneAssignmentRecommendation,
    IncidentAssessment,
    EscortFeasibilityAssessment,
    EscortRelayRecommendation,
    AuditEntry,
)
from .audit_logger import get_audit_log, log_audit
from .graphs.drone_assignment_graph import drone_assignment_graph
from .graphs.incident_graph import incident_graph
from .graphs.escort_relay_graph import escort_relay_graph

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

# In-memory agent state storage
_active_incidents: Dict[str, IncidentAssessment] = {}
_pending_recommendations: Dict[str, DroneAssignmentRecommendation] = {}
_recent_recommendations: List[DroneAssignmentRecommendation] = []
_active_escort_feasibility: Optional[EscortFeasibilityAssessment] = None
_pending_relay_recommendations: Dict[str, EscortRelayRecommendation] = {}
_drone_agent_status: str = 'IDLE'
_incident_agent_status: str = 'IDLE'
_latest_drones: List[Dict[str, Any]] = []
_last_evaluated_ambulance_code: Optional[str] = None
_last_evaluated_escort_drone: Optional[str] = None

_background_task: Optional[asyncio.Task] = None


async def sync_with_simulation():
    """Background polling loop observing real simulation state from Express backend."""
    global _drone_agent_status, _incident_agent_status
    async with httpx.AsyncClient(timeout=4.0) as client:
        while True:
            try:
                res = await client.get(f"{BACKEND_URL}/api/simulation")
                if res.status_code == 200:
                    payload = res.json()
                    snapshot = payload.get('data') or payload
                    await process_simulation_snapshot(snapshot, client)
            except Exception as e:
                # Backend might not be up yet
                pass
            await asyncio.sleep(2.0)


async def process_simulation_snapshot(snapshot: Dict[str, Any], client: httpx.AsyncClient):
    global _drone_agent_status, _incident_agent_status, _latest_drones, _active_escort_feasibility, _last_evaluated_ambulance_code, _last_evaluated_escort_drone
    vehicles = snapshot.get('vehicles', [])
    drones = snapshot.get('drones', [])
    if drones:
        _latest_drones = drones
    ambulance = snapshot.get('ambulance')
    sos = snapshot.get('sos')
    suspicious = snapshot.get('suspicious')

    stopped_vehicles = [v for v in vehicles if v.get('stopped')]

    if stopped_vehicles:
        _incident_agent_status = 'OBSERVING'
        # Evaluate each stopped vehicle
        for v in stopped_vehicles:
            code = v.get('code')
            # Check if drone is assigned to it
            assigned_drone = None
            if suspicious and suspicious.get('vehicleCode') == code and suspicious.get('assignedDroneCode'):
                assigned_drone = next(
                    (d for d in drones if d.get('code') == suspicious.get('assignedDroneCode')), None
                )

            # Invoke LangGraph Incident Graph
            initial_state = {
                'incident_id': suspicious.get('id') if suspicious and suspicious.get('vehicleCode') == code else None,
                'vehicle': v,
                'all_vehicles': vehicles,
                'ambulance_state': ambulance,
                'sos_state': sos,
                'drone_fleet': drones,
                'active_assigned_drone': assigned_drone,
            }

            result = await asyncio.to_thread(incident_graph.invoke, initial_state)
            assessment: Optional[IncidentAssessment] = result.get('assessment')

            if assessment:
                _active_incidents[assessment.incidentId] = assessment

                # If anomaly warrants investigation and no drone assigned yet, trigger Drone Assignment Agent
                if result.get('anomaly_status') == 'INVESTIGATE' and not assessment.assignedDroneCode:
                    # Check if recommendation already pending for this vehicle
                    already_pending = any(
                        r.targetId == code and r.status == 'PENDING_APPROVAL'
                        for r in _pending_recommendations.values()
                    )
                    if not already_pending:
                        _drone_agent_status = 'EVALUATING'
                        drone_input = {
                            'target_type': 'INCIDENT',
                            'target_id': code,
                            'target_position': v.get('position', [0.0, 0.0]),
                            'target_zone': None,
                            'drones': drones,
                        }
                        drone_res = await asyncio.to_thread(drone_assignment_graph.invoke, drone_input)
                        rec: Optional[DroneAssignmentRecommendation] = drone_res.get('recommendation')
                        if rec:
                            _pending_recommendations[rec.id] = rec
                            _recent_recommendations.insert(0, rec)
                            if len(_recent_recommendations) > 20:
                                _recent_recommendations.pop()
                        _drone_agent_status = 'IDLE'

        # Clean resolved vehicles
        stopped_codes = {v.get('code') for v in stopped_vehicles}
        to_delete = [
            inc_id for inc_id, inc in _active_incidents.items()
            if inc.vehicleCode not in stopped_codes
        ]
        for inc_id in to_delete:
            del _active_incidents[inc_id]
    else:
        _incident_agent_status = 'IDLE'
        _active_incidents.clear()

    # Escort Feasibility Self-Reflection & Relay Evaluation (Event-Driven on Allocation Only)
    amb_active = ambulance and ambulance.get('active', True) and ambulance.get('assignedDroneCode')
    if amb_active:
        amb_code = ambulance.get('vehicleCode')
        current_drone = ambulance.get('assignedDroneCode')

        # Trigger the agent ONLY when ambulance starts or a new drone gets allocated
        is_new_allocation = (amb_code != _last_evaluated_ambulance_code) or (current_drone != _last_evaluated_escort_drone)
        if is_new_allocation:
            logger.info(f"Triggering Escort Feasibility Agent: Ambulance {amb_code} -> Drone {current_drone}")
            _drone_agent_status = 'EVALUATING'
            try:
                escort_state = {
                    'ambulance_state': ambulance,
                    'drones': drones,
                }
                relay_res = await asyncio.to_thread(escort_relay_graph.invoke, escort_state)
                feasibility: Optional[EscortFeasibilityAssessment] = relay_res.get('assessment')
                relay_rec: Optional[EscortRelayRecommendation] = relay_res.get('recommendation')

                if feasibility:
                    _active_escort_feasibility = feasibility
                if relay_rec:
                    # Clean previous pending recommendations and set the new one
                    _pending_relay_recommendations.clear()
                    _pending_relay_recommendations[relay_rec.id] = relay_rec
                else:
                    _pending_relay_recommendations.clear()

                _last_evaluated_ambulance_code = amb_code
                _last_evaluated_escort_drone = current_drone
            except Exception as e:
                logger.error(f"Error evaluating ambulance escort feasibility: {e}")
            finally:
                # Analysis complete: Agent goes back to IDLE
                _drone_agent_status = 'IDLE'
    else:
        # Ambulance completed or inactive: reset tracking and clear active card
        if _last_evaluated_ambulance_code is not None:
            _last_evaluated_ambulance_code = None
            _last_evaluated_escort_drone = None
            _active_escort_feasibility = None
            _pending_relay_recommendations.clear()



@asynccontextmanager
async def lifespan(app: FastAPI):
    global _background_task
    logger.info("Starting AeroGuard 3D Python AI Agent Service...")
    _background_task = asyncio.create_task(sync_with_simulation())
    log_audit(
        agent='SYSTEM',
        event_type='SERVICE_START',
        headline="AeroGuard 3D AI Agent Service (LangGraph + Gemini) started",
        details="Intelligent Drone Assignment and Incident Detection agents initialized."
    )
    yield
    if _background_task:
        _background_task.cancel()
    logger.info("Shutting down AeroGuard 3D AI Agent Service...")


app = FastAPI(title="AeroGuard 3D AI Agents", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    config = get_config()
    return {
        "status": "ok",
        "service": "aeroguard-ai-agents",
        "geminiModel": config.geminiModel,
        "activeIncidents": len(_active_incidents),
        "pendingRecommendations": len(_pending_recommendations),
    }


@app.get("/api/agent/state", response_model=AgentStateSnapshot)
def get_agent_state():
    config = get_config()
    return AgentStateSnapshot(
        droneAgentStatus=_drone_agent_status,  # type: ignore
        incidentAgentStatus=_incident_agent_status,  # type: ignore
        activeIncidents=list(_active_incidents.values()),
        pendingRecommendations=list(_pending_recommendations.values()),
        recentRecommendations=_recent_recommendations[:10],
        activeEscortFeasibility=_active_escort_feasibility,
        pendingRelayRecommendations=list(_pending_relay_recommendations.values()),
        auditLog=get_audit_log(50),
        operationalReadiness={
            'incidentsCount': len(_active_incidents),
            'pendingCount': len(_pending_recommendations),
            'hasRelayPending': len(_pending_relay_recommendations) > 0,
        },
        config=config,
    )


@app.post("/api/agent/drone/evaluate", response_model=DroneAssignmentRecommendation)
async def evaluate_drone_assignment(payload: Dict[str, Any]):
    """Runs the LangGraph Drone Assignment graph on demand."""
    global _drone_agent_status
    _drone_agent_status = 'EVALUATING'
    try:
        normalized = {
            'target_type': payload.get('target_type') or payload.get('targetType', 'INCIDENT'),
            'target_id': payload.get('target_id') or payload.get('targetId', 'UNKNOWN'),
            'target_position': payload.get('target_position') or payload.get('targetPosition', [77.925, 12.658]),
            'target_zone': payload.get('target_zone') or payload.get('targetZone'),
            'drones': payload.get('drones') or _latest_drones,
        }
        result = await asyncio.to_thread(drone_assignment_graph.invoke, normalized)
        rec: Optional[DroneAssignmentRecommendation] = result.get('recommendation')
        if not rec:
            raise HTTPException(status_code=500, detail="Failed to generate drone recommendation")

        _pending_recommendations[rec.id] = rec
        _recent_recommendations.insert(0, rec)
        if len(_recent_recommendations) > 20:
            _recent_recommendations.pop()
        return rec
    finally:
        _drone_agent_status = 'IDLE'


@app.post("/api/agent/incident/evaluate", response_model=IncidentAssessment)
async def evaluate_incident(payload: Dict[str, Any]):
    """Runs the LangGraph Incident Graph on demand."""
    result = await asyncio.to_thread(incident_graph.invoke, payload)
    assessment: Optional[IncidentAssessment] = result.get('assessment')
    if not assessment:
        raise HTTPException(status_code=500, detail="Failed to generate incident assessment")
    _active_incidents[assessment.incidentId] = assessment
    return assessment


@app.post("/api/agent/recommendations/{rec_id}/approve", response_model=DroneAssignmentRecommendation)
async def approve_recommendation(rec_id: str):
    """Operator approval of an AI Recommendation (Human-In-The-Loop)."""
    rec = _pending_recommendations.get(rec_id)
    if not rec:
        # Check in recent recommendations
        rec = next((r for r in _recent_recommendations if r.id == rec_id), None)
        if not rec:
            raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")

    rec.status = 'APPROVED'
    rec.decidedAtIso = datetime.now(timezone.utc).isoformat()

    log_audit(
        agent='OPERATOR',
        event_type='RECOMMENDATION_APPROVED',
        headline=f"Operator approved {rec.targetType} dispatch for {rec.selectedDroneCode}",
        details=f"Target: {rec.targetId}. Drone {rec.selectedDroneCode} approved for mission execution.",
        related_entity_id=rec.selectedDroneCode,
    )

    # Execute bounded action via tool call back to Express simulation engine
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            if rec.targetType in ['INCIDENT', 'MANUAL']:
                # Call backend to assign drone to monitoring
                await client.post(
                    f"{BACKEND_URL}/api/agents/drone/assign",
                    json={
                        "droneCode": rec.selectedDroneCode,
                        "mode": "MONITORING",
                        "targetPosition": rec.targetPosition,
                        "targetEntityCode": rec.targetId,
                    }
                )
            elif rec.targetType == 'SOS':
                # Call backend to start/update SOS with drone
                await client.post(
                    f"{BACKEND_URL}/api/emergency/sos",
                    json={
                        "longitude": rec.targetPosition[0],
                        "latitude": rec.targetPosition[1],
                        "preferredDroneCode": rec.selectedDroneCode,
                    }
                )
            rec.status = 'EXECUTED'
        except Exception as e:
            logger.error(f"Error executing approved action against simulation backend: {e}")

    # Remove from pending
    if rec_id in _pending_recommendations:
        del _pending_recommendations[rec_id]

    return rec


@app.post("/api/agent/recommendations/{rec_id}/reject", response_model=DroneAssignmentRecommendation)
def reject_recommendation(rec_id: str):
    """Operator rejection of an AI Recommendation."""
    rec = _pending_recommendations.get(rec_id)
    if not rec:
        rec = next((r for r in _recent_recommendations if r.id == rec_id), None)
        if not rec:
            raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")

    rec.status = 'REJECTED'
    rec.decidedAtIso = datetime.now(timezone.utc).isoformat()

    log_audit(
        agent='OPERATOR',
        event_type='RECOMMENDATION_REJECTED',
        headline=f"Operator rejected {rec.targetType} dispatch for {rec.selectedDroneCode}",
        details=f"Target: {rec.targetId}. Dispatch cancelled by operator decision.",
        related_entity_id=rec.selectedDroneCode,
    )

    if rec_id in _pending_recommendations:
        del _pending_recommendations[rec_id]

    return rec


@app.get("/api/agent/audit", response_model=List[AuditEntry])
def get_audit():
    return get_audit_log(100)


@app.post("/api/agent/config", response_model=AgentConfigModel)
def set_agent_config(new_config: AgentConfigModel):
    updated = update_config(new_config)
    log_audit(
        agent='OPERATOR',
        event_type='CONFIG_UPDATED',
        headline="Agent configuration weights and thresholds updated",
        details=f"Minimum battery: {updated.minimumBattery}%, Distance weight: {updated.distanceWeight}",
    )
    return updated


@app.get("/api/agent/escort/feasibility", response_model=Optional[EscortFeasibilityAssessment])
def get_escort_feasibility():
    """Returns active ambulance escort feasibility evaluation if an escort is active."""
    return _active_escort_feasibility


@app.post("/api/agent/escort/evaluate")
async def evaluate_escort_feasibility_endpoint(payload: Dict[str, Any]):
    """Evaluates drone endurance vs hospital journey on-demand."""
    amb = payload.get('ambulance') or payload.get('ambulance_state')
    drones = payload.get('drones') or _latest_drones
    if not amb:
        raise HTTPException(status_code=400, detail="Ambulance state is required")
    res = await asyncio.to_thread(
        escort_relay_graph.invoke,
        {'ambulance_state': amb, 'drones': drones}
    )
    assessment: Optional[EscortFeasibilityAssessment] = res.get('assessment')
    rec: Optional[EscortRelayRecommendation] = res.get('recommendation')
    if assessment:
        global _active_escort_feasibility
        _active_escort_feasibility = assessment
    if rec:
        _pending_relay_recommendations[rec.id] = rec

    return {
        'assessment': assessment,
        'recommendation': rec,
    }


@app.post("/api/agent/escort/relay/{relay_id}/approve", response_model=EscortRelayRecommendation)
async def approve_escort_relay(relay_id: str):
    """Operator approval of drone relay handoff for ambulance escort (Human-In-The-Loop)."""
    rec = _pending_relay_recommendations.get(relay_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Relay recommendation {relay_id} not found")

    rec.status = 'APPROVED'
    rec.decidedAtIso = datetime.now(timezone.utc).isoformat()

    log_audit(
        agent='OPERATOR',
        event_type='ESCORT_RELAY_APPROVED',
        headline=f"Operator approved escort relay: {rec.currentDroneCode} -> {rec.relayDroneCode}",
        details=f"Ambulance {rec.ambulanceCode} en route to {rec.hospitalName}. Relief drone {rec.relayDroneCode} assigned to take over escort station.",
        related_entity_id=rec.ambulanceCode,
    )

    # Execute bounded action via tool call back to Express simulation engine
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            await client.post(
                f"{BACKEND_URL}/api/agents/drone/relay",
                json={
                    "newDroneCode": rec.relayDroneCode,
                    "previousDroneCode": rec.currentDroneCode,
                    "ambulanceCode": rec.ambulanceCode,
                }
            )
            rec.status = 'EXECUTED'
        except Exception as e:
            logger.error(f"Error executing escort relay against simulation backend: {e}")

    if relay_id in _pending_relay_recommendations:
        del _pending_relay_recommendations[relay_id]

    return rec


@app.post("/api/agent/escort/relay/{relay_id}/reject", response_model=EscortRelayRecommendation)
def reject_escort_relay(relay_id: str):
    """Operator rejection of drone relay handoff for ambulance escort."""
    rec = _pending_relay_recommendations.get(relay_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Relay recommendation {relay_id} not found")

    rec.status = 'REJECTED'
    rec.decidedAtIso = datetime.now(timezone.utc).isoformat()

    log_audit(
        agent='OPERATOR',
        event_type='ESCORT_RELAY_REJECTED',
        headline=f"Operator rejected escort relay to {rec.relayDroneCode}",
        details=f"Ambulance {rec.ambulanceCode} will retain {rec.currentDroneCode} as escort drone.",
        related_entity_id=rec.ambulanceCode,
    )

    if relay_id in _pending_relay_recommendations:
        del _pending_relay_recommendations[relay_id]

    return rec


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service.main:app", host=HOST, port=PORT, reload=True)
