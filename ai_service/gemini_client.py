from __future__ import annotations
import logging
from typing import Optional, Dict, Any
from .config import get_config, GEMINI_API_KEY

logger = logging.getLogger('gemini_client')

_llm_instance = None


def get_gemini_llm():
    """Initializes and returns the LangChain ChatGoogleGenerativeAI instance."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    config = get_config()
    api_key = GEMINI_API_KEY
    if not api_key:
        logger.warning('GEMINI_API_KEY not found in environment. Fallback reasoning will be used.')
        return None

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        _llm_instance = ChatGoogleGenerativeAI(
            model=config.geminiModel,
            google_api_key=api_key,
            temperature=0.2,
            max_output_tokens=1024,
        )
        logger.info(f'Initialized ChatGoogleGenerativeAI with model: {config.geminiModel}')
        return _llm_instance
    except Exception as e:
        logger.error(f'Failed to initialize ChatGoogleGenerativeAI: {e}')
        return None


def generate_drone_assignment_reasoning(
    target_type: str,
    target_id: str,
    target_pos: list[float],
    selected_candidate: Dict[str, Any],
    runner_up: Optional[Dict[str, Any]],
    total_eligible: int,
) -> str:
    """Generates an operational explanation for why a specific drone was selected."""
    llm = get_gemini_llm()
    if llm:
        try:
            prompt = (
                f"You are an AI Drone Dispatcher for highway corridor emergency operations (Krishnagiri to Hosur NH-44).\n"
                f"Mission Event: {target_type} ({target_id}) at coordinates {target_pos}.\n"
                f"Selected Drone: {selected_candidate['droneCode']} ({selected_candidate['name']})\n"
                f"- Distance: {selected_candidate['distanceMeters']:.0f} m\n"
                f"- ETA: {selected_candidate['etaSeconds']:.0f} s\n"
                f"- Battery: {selected_candidate['battery']:.0f}%\n"
                f"- Current Mode: {selected_candidate['mode']}\n"
                f"- Patrol Zone: {selected_candidate['zoneCode']}\n"
                f"- Composite Suitability Score: {selected_candidate['score']:.1f}/100\n"
                f"Next best candidate: {runner_up['droneCode'] if runner_up else 'None'} "
                f"(Distance: {runner_up['distanceMeters']:.0f}m, Battery: {runner_up['battery']:.0f}%, Score: {runner_up['score']:.1f})\n"
                f"Total eligible drones evaluated: {total_eligible}/10.\n\n"
                f"Provide a concise (2-3 sentences), professional, authoritative operational explanation justifying why {selected_candidate['droneCode']} is recommended for this assignment over other fleet units."
            )
            response = llm.invoke(prompt)
            content = response.content
            if isinstance(content, str) and len(content.strip()) > 10:
                return content.strip()
        except Exception as e:
            logger.warning(f'Gemini API invocation error: {e}. Using deterministic reasoning fallback.')

    # High-quality deterministic operational fallback
    dist_km = selected_candidate['distanceMeters'] / 1000
    eta_sec = int(selected_candidate['etaSeconds'])
    battery = int(selected_candidate['battery'])
    drone_code = selected_candidate['droneCode']
    zone = selected_candidate['zoneCode']

    if runner_up:
        runner_code = runner_up['droneCode']
        runner_dist = runner_up['distanceMeters'] / 1000
        return (
            f"{drone_code} is ranked #1 with the highest composite suitability score ({selected_candidate['score']:.1f}/100). "
            f"It offers optimal proximity ({dist_km:.1f} km, {eta_sec}s ETA) and ample battery reserve ({battery}%) from {zone}, "
            f"outranking {runner_code} ({runner_dist:.1f} km away) with no higher-priority mission conflicts."
        )
    return (
        f"{drone_code} is the highest-ranked available resource with a suitability score of {selected_candidate['score']:.1f}/100. "
        f"It provides rapid on-scene intercept ({dist_km:.1f} km, {eta_sec}s ETA) and {battery}% battery, satisfying all mission criteria."
    )


def generate_incident_risk_reasoning(
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """Generates explainable incident risk assessment using Gemini or fallback."""
    llm = get_gemini_llm()
    if llm:
        try:
            import json
            prompt = (
                f"You are the Highway Incident Detection & Investigation Agent for the NH-44 Krishnagiri-Hosur Corridor.\n"
                f"Context Evidence:\n"
                f"- Vehicle: {context.get('vehicleCode')} ({context.get('vehicleKind')})\n"
                f"- Stoppage Duration: {context.get('stoppedDurationMinutes', 0):.0f} simulated minutes\n"
                f"- Chainage: NH-44 at {context.get('chainageMeters', 0)/1000:.1f} km ({context.get('sectorName')})\n"
                f"- Road Position: {'Hard shoulder' if context.get('lane') == 0 else 'Active running lane'}\n"
                f"- Traffic Density: {context.get('trafficDensity')}\n"
                f"- Traffic Impact: {context.get('trafficImpact')}\n"
                f"- Nearby Emergencies Active: {context.get('nearbyEmergencies')}\n"
                f"- Drone Visual Observation: {context.get('droneObserved')}\n"
                f"- Drone On Station: {context.get('droneOnStation')}\n\n"
                f"Perform a professional operational assessment. Return ONLY a valid JSON object with these keys:\n"
                f"{{\n"
                f'  "risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",\n'
                f'  "whatHappened": "brief factual description of vehicle stoppage and position",\n'
                f'  "whatWasInvestigated": ["duration", "road position", "traffic density", "emergency interference", "drone visual"],\n'
                f'  "recommendation": "specific action recommendation",\n'
                f'  "reason": "clear concise justification for the risk level and recommendation"\n'
                f"}}"
            )
            response = llm.invoke(prompt)
            text = response.content
            # Clean markdown code blocks if present
            if '```' in text:
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
            parsed = json.loads(text.strip())
            return {
                "risk": parsed.get("risk", "MEDIUM"),
                "whatHappened": parsed.get("whatHappened", ""),
                "whatWasInvestigated": parsed.get("whatWasInvestigated", []),
                "recommendation": parsed.get("recommendation", ""),
                "reason": parsed.get("reason", ""),
            }
        except Exception as e:
            logger.warning(f'Gemini incident evaluation error: {e}. Using deterministic assessment fallback.')

    # Deterministic fallback reasoning
    duration = context.get('stoppedDurationMinutes', 0)
    vehicle_code = context.get('vehicleCode', 'Unknown')
    kind = context.get('vehicleKind', 'Vehicle')
    lane = context.get('lane', 0)
    traffic_impact = context.get('trafficImpact', 'LOW')
    sector = context.get('sectorName', 'NH-44')
    drone_observed = context.get('droneObserved', False)

    is_shoulder = (lane == 0)

    if duration >= 60 or (not is_shoulder and duration >= 25) or traffic_impact == 'HIGH':
        risk = "HIGH" if duration < 80 else "CRITICAL"
        recommendation = "Simulated police dispatch (100) and traffic control escort."
        reason = (
            f"Prolonged stationary duration ({duration:.0f} min) combined with {traffic_impact.lower()} traffic impact "
            f"and continuous occupancy near {sector} requires escalation to simulated police authorities."
        )
    elif duration >= 15 or not is_shoulder:
        risk = "MEDIUM"
        recommendation = "Continue drone observation and broadcast speaker advisory."
        reason = (
            f"{kind} has been stationary for {duration:.0f} minutes on the {'shoulder' if is_shoulder else 'running lane'}. "
            f"Limited immediate disruption observed, but ongoing surveillance is required."
        )
    else:
        risk = "LOW"
        recommendation = "Monitor vehicle via corridor sensors."
        reason = f"Short duration stoppage ({duration:.0f} min) with no significant traffic hazard."

    return {
        "risk": risk,
        "whatHappened": f"Vehicle {vehicle_code} ({kind}) has remained stationary for {duration:.0f} simulated minutes near {sector} on NH-44.",
        "whatWasInvestigated": [
            f"Stoppage duration ({duration:.0f} minutes)",
            f"Carriageway position ({'Hard shoulder' if is_shoulder else 'Active lane'})",
            f"Traffic density & impact ({traffic_impact})",
            "Nearby active emergency status",
            f"Drone visual surveillance ({'Active' if drone_observed else 'Pending'})",
        ],
        "recommendation": recommendation,
        "reason": reason,
    }


def generate_escort_relay_reasoning(
    current_drone_code: str,
    current_drone_model: str,
    current_battery: float,
    required_battery: float,
    hospital_name: str,
    distance_km: float,
    depletion_km: Optional[float] = None,
    relay_drone_code: Optional[str] = None,
    relay_drone_model: Optional[str] = None,
    relay_battery: Optional[float] = None,
) -> str:
    """Generates Gemini operational explanation for ambulance escort feasibility and relay handoff."""
    llm = get_gemini_llm()
    if llm:
        try:
            prompt = f"""You are the AeroGuard 3D Chief Aviation Dispatcher evaluating an active ambulance priority run along the NH-44 corridor.
The ambulance is transporting a critical patient to {hospital_name} ({distance_km:.1f} km remaining).
Assigned Drone: {current_drone_code} (Model: {current_drone_model})
Current Battery: {current_battery:.1f}%
Total Battery Required for Full Escort + Safe Reserve: {required_battery:.1f}%
Endurance Status: {'SUFFICIENT' if current_battery >= required_battery else f'INSUFFICIENT (Will deplete {depletion_km:.1f} km before hospital)'}
Relay Candidate: {f'{relay_drone_code} ({relay_drone_model}, {relay_battery:.1f}% battery)' if relay_drone_code else 'None available'}

In 2 to 3 concise, highly professional military/aviation command sentences:
1. Explain whether {current_drone_code} can complete the entire escort to {hospital_name} based on its model specifications and battery.
2. If battery is insufficient, justify why a mid-corridor relay handoff to {relay_drone_code} is necessary to ensure continuous siren/visual clearance without stranding the drone.
Focus purely on flight safety, corridor logistics, and patient transit speed."""

            res = llm.invoke(prompt)
            text = res.content if hasattr(res, "content") else str(res)
            if isinstance(text, list):
                text = " ".join(str(item) for item in text)
            if text and len(text.strip()) > 20:
                return text.strip()
        except Exception as e:
            logger.warning(f"Gemini escort relay reasoning failed: {e}. Falling back to template.")

    # High-quality deterministic fallback
    if current_battery >= required_battery:
        return (
            f"{current_drone_code} ({current_drone_model}) has ample endurance ({current_battery:.1f}%) to escort the "
            f"ambulance across the entire {distance_km:.1f} km run to {hospital_name} with >20% reserve remaining. "
            f"No relay handoff required."
        )

    relay_part = (
        f"Recommending an immediate mid-corridor relay handoff to {relay_drone_code} ({relay_drone_model}, {relay_battery:.1f}% battery) "
        f"ahead along NH-44 to ensure uninterrupted siren clearing and patient escort."
        if relay_drone_code
        else "All corridor relay drones are currently committed or below safe reserves; monitor for emergency landing pads."
    )

    return (
        f"Escort Feasibility Assessment: {current_drone_code} ({current_drone_model}) has only {current_battery:.1f}% battery, "
        f"falling short of the {required_battery:.1f}% required to reach {hospital_name} ({distance_km:.1f} km away). "
        f"The drone will reach critical reserve approximately {depletion_km or (distance_km * 0.4):.1f} km before the hospital. "
        f"{relay_part}"
    )

