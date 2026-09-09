from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

from ..models import DroneCandidate, DroneAssignmentRecommendation
from ..tools.drone_tools import rank_candidate_drones
from ..gemini_client import generate_drone_assignment_reasoning
from ..audit_logger import log_audit
from ..config import get_config


class DroneAssignmentState(TypedDict, total=False):
    target_type: str
    target_id: str
    target_position: List[float]
    target_zone: Optional[str]
    drones: List[Dict[str, Any]]
    candidates: List[DroneCandidate]
    selected_candidate: Optional[DroneCandidate]
    runner_up_candidate: Optional[DroneCandidate]
    explanation: str
    recommendation: Optional[DroneAssignmentRecommendation]


def filter_and_score_node(state: DroneAssignmentState) -> Dict[str, Any]:
    """Evaluates all 10 drones, scores, and ranks candidates deterministically."""
    drones = state.get('drones', [])
    target_pos = state.get('target_position', [0.0, 0.0])
    target_zone = state.get('target_zone')
    target_type = state.get('target_type', 'INCIDENT')

    mission_code = 'SOS_TRACKING' if target_type == 'SOS' else 'MONITORING'
    candidates = rank_candidate_drones(drones, target_pos, target_zone, mission_code)

    selected = candidates[0] if candidates and candidates[0].eligible else None
    runner_up = candidates[1] if len(candidates) > 1 and candidates[1].eligible else None

    return {
        'candidates': candidates,
        'selected_candidate': selected,
        'runner_up_candidate': runner_up,
    }


def gemini_reasoning_node(state: DroneAssignmentState) -> Dict[str, Any]:
    """Invokes Gemini via LangChain to generate human-readable operational justification."""
    selected = state.get('selected_candidate')
    runner_up = state.get('runner_up_candidate')
    target_type = state.get('target_type', 'EVENT')
    target_id = state.get('target_id', 'UNKNOWN')
    target_pos = state.get('target_position', [0.0, 0.0])
    candidates = state.get('candidates', [])
    total_eligible = sum(1 for c in candidates if c.eligible)

    if not selected:
        explanation = (
            f"No suitable drone could be assigned to {target_id}. All available units in the 10-drone fleet "
            f"are either charging, below minimum reserve ({get_config().minimumBattery}%), or committed to higher-priority calls."
        )
        return {'explanation': explanation}

    explanation = generate_drone_assignment_reasoning(
        target_type=target_type,
        target_id=target_id,
        target_pos=target_pos,
        selected_candidate=selected.model_dump(),
        runner_up=runner_up.model_dump() if runner_up else None,
        total_eligible=total_eligible,
    )
    return {'explanation': explanation}


def generate_recommendation_node(state: DroneAssignmentState) -> Dict[str, Any]:
    """Creates structured recommendation and creates audit entry."""
    selected = state.get('selected_candidate')
    candidates = state.get('candidates', [])
    explanation = state.get('explanation', '')
    target_type = state.get('target_type', 'INCIDENT')  # type: ignore
    target_id = state.get('target_id', 'UNKNOWN')
    target_pos = state.get('target_position', [0.0, 0.0])

    config = get_config()
    rec_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    selected_code = selected.droneCode if selected else 'NONE'

    recommendation = DroneAssignmentRecommendation(
        id=rec_id,
        targetType=target_type,  # type: ignore
        targetId=target_id,
        targetPosition=target_pos,
        selectedDroneCode=selected_code,
        candidates=candidates,
        explanation=explanation,
        status='APPROVED' if config.autoApproveDroneDispatch else 'PENDING_APPROVAL',
        requiresApproval=not config.autoApproveDroneDispatch,
        createdAtIso=now_iso,
    )

    log_audit(
        agent='DRONE_ASSIGNMENT_AGENT',
        event_type='DRONE_EVALUATION',
        headline=f"Evaluated 10 drones for {target_type} {target_id} -> {selected_code} selected",
        details=explanation,
        related_entity_id=selected_code,
    )

    return {'recommendation': recommendation}


# Build LangGraph StateGraph
builder = StateGraph(DroneAssignmentState)
builder.add_node('filter_and_score', filter_and_score_node)
builder.add_node('gemini_reasoning', gemini_reasoning_node)
builder.add_node('generate_recommendation', generate_recommendation_node)

builder.add_edge(START, 'filter_and_score')
builder.add_edge('filter_and_score', 'gemini_reasoning')
builder.add_edge('gemini_reasoning', 'generate_recommendation')
builder.add_edge('generate_recommendation', END)

drone_assignment_graph = builder.compile()
