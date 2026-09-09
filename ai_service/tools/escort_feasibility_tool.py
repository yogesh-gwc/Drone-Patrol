from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from ..models import DroneSpec, EscortFeasibilityAssessment, DroneCandidate

logger = logging.getLogger("ai_service.escort_tool")

_cached_specs: Optional[Dict[str, DroneSpec]] = None

def get_all_drone_specs() -> Dict[str, DroneSpec]:
    """Loads mock technical specifications from drone_specs.json."""
    global _cached_specs
    if _cached_specs is not None:
        return _cached_specs

    specs_path = Path(__file__).resolve().parent.parent / "data" / "drone_specs.json"
    if not specs_path.exists():
        # Fallback path if run from root
        specs_path = Path(__file__).resolve().parent.parent.parent / "ai_service" / "data" / "drone_specs.json"

    if specs_path.exists():
        try:
            with open(specs_path, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                _cached_specs = {k: DroneSpec(**v) for k, v in raw_data.items()}
                return _cached_specs
        except Exception as e:
            logger.error(f"Failed to load drone_specs.json: {e}")

    # Fallback default specs if file is missing
    _cached_specs = {
        f"DR-{i:02d}": DroneSpec(
            droneCode=f"DR-{i:02d}",
            name=f"Aeroguard DR-{i:02d}",
            model="DJI Matrice 350 RTK" if i % 2 == 1 else "AeroGuard Sentinel X8",
            manufacturer="DJI Enterprise" if i % 2 == 1 else "AeroGuard Systems",
            batteryCapacityWh=263.2 if i % 2 == 1 else 310.0,
            maxFlightTimeMinutes=45 if i % 2 == 1 else 52,
            maxSpeedKmh=85.0,
            maxRangeKm=28.0,
            consumptionRatePerKm=2.8 if i % 2 == 1 else 2.5,
            minimumReservePercent=20.0,
            cameraType="4K 30x Optical Zoom + Thermal",
            speakerDecibels=120,
            zoneCode=f"Z-{i:02d}",
        )
        for i in range(1, 11)
    }
    return _cached_specs


def get_drone_spec(drone_code: str) -> DroneSpec:
    """Returns technical specifications for a specific drone code."""
    specs = get_all_drone_specs()
    return specs.get(
        drone_code,
        DroneSpec(
            droneCode=drone_code,
            name=f"Aeroguard {drone_code}",
            model="AeroGuard Sentinel X8",
            manufacturer="AeroGuard Systems",
            batteryCapacityWh=300.0,
            maxFlightTimeMinutes=48,
            maxSpeedKmh=85.0,
            maxRangeKm=28.0,
            consumptionRatePerKm=2.8,
            minimumReservePercent=20.0,
            cameraType="4K 30x Optical Zoom",
            speakerDecibels=120,
            zoneCode="Z-01",
        ),
    )


def evaluate_escort_mission_feasibility(
    ambulance_state: Dict[str, Any],
    drones: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Evaluates whether the currently assigned drone can escort the ambulance
    for the entire remaining journey to the destination hospital.
    
    If battery is insufficient, identifies the optimal relay relief drone along the corridor.
    """
    amb_code = ambulance_state.get('vehicleCode') or 'AMB-001'
    assigned_drone_code = ambulance_state.get('assignedDroneCode')
    hospital_name = ambulance_state.get('destinationName') or 'Nearest Hospital'
    
    # Distance remaining in meters
    rem_meters = float(
        ambulance_state.get('distanceRemainingMeters')
        or ambulance_state.get('remainingMeters')
        or 18000.0
    )
    rem_km = rem_meters / 1000.0
    
    # Ambulance cruising speed (~96 km/h or 26.7 m/s)
    speed_kmh = 96.0
    est_duration_min = round((rem_meters / (speed_kmh / 3.6)) / 60.0, 1)

    if not assigned_drone_code or assigned_drone_code == 'NONE':
        return {
            'feasible': False,
            'status': 'INSUFFICIENT_RANGE',
            'assigned_drone_code': 'NONE',
            'drone_model': 'UNKNOWN',
            'current_battery': 0.0,
            'required_battery': 100.0,
            'deficit_percent': 100.0,
            'reason': 'No drone is currently assigned to escort the ambulance.',
            'relay_candidates': [],
            'best_relay_drone': None,
        }

    # Locate assigned drone runtime state
    current_drone = next((d for d in drones if d.get('code') == assigned_drone_code), None)
    current_battery = float(current_drone.get('batteryPercentage', 50.0)) if current_drone else 50.0
    spec = get_drone_spec(assigned_drone_code)

    # Battery needed = (km * dischargeRate) + safeReserve
    required_battery = round((rem_km * spec.consumptionRatePerKm) + spec.minimumReservePercent, 1)
    deficit = round(required_battery - current_battery, 1)

    feasible = current_battery >= required_battery

    # Calculate where the current drone will hit minimum safe reserve
    depletion_km = None
    if not feasible:
        usable_battery = max(0.0, current_battery - spec.minimumReservePercent)
        max_escort_km = usable_battery / spec.consumptionRatePerKm
        depletion_km = round(max(0.0, rem_km - max_escort_km), 1)

    # If insufficient, search for relay candidates in the fleet
    relay_candidates = []
    best_relay_drone = None
    if not feasible:
        relay_candidates = find_escort_relay_candidates(
            ambulance_state=ambulance_state,
            current_drone_code=assigned_drone_code,
            drones=drones,
            remaining_to_hospital_meters=rem_meters,
        )
        if relay_candidates:
            best_relay_drone = relay_candidates[0]

    return {
        'ambulance_code': amb_code,
        'assigned_drone_code': assigned_drone_code,
        'drone_model': spec.model,
        'spec': spec,
        'hospital_name': hospital_name,
        'distance_to_hospital_meters': rem_meters,
        'estimated_duration_minutes': est_duration_min,
        'current_battery': current_battery,
        'required_battery': required_battery,
        'deficit_percent': max(0.0, deficit),
        'feasible': feasible,
        'status': 'FEASIBLE' if feasible else 'INSUFFICIENT_RANGE',
        'depletion_distance_km': depletion_km,
        'relay_candidates': relay_candidates,
        'best_relay_drone': best_relay_drone,
    }


def find_escort_relay_candidates(
    ambulance_state: Dict[str, Any],
    current_drone_code: str,
    drones: List[Dict[str, Any]],
    remaining_to_hospital_meters: float,
) -> List[Dict[str, Any]]:
    """
    Identifies and scores candidate drones that can act as relay escorts
    to take over from the current drone and reach the hospital safely.
    """
    dest_chainage = float(ambulance_state.get('destinationChainageMeters') or 40000.0)
    candidates = []

    for d in drones:
        code = d.get('code')
        if code == current_drone_code:
            continue

        battery = float(d.get('batteryPercentage', 0.0))
        mode = d.get('mode', 'PATROLLING')

        # Exclude drones that cannot take missions
        if battery < 30.0 or mode in ['OFFLINE', 'CHARGING', 'RETURNING']:
            continue

        spec = get_drone_spec(code)
        drone_dist = float(d.get('distanceAlongMeters', 0.0))

        # Distance from this drone's current position to the destination hospital
        dist_to_hospital = abs(dest_chainage - drone_dist)
        dist_to_hospital_km = dist_to_hospital / 1000.0

        # Required battery for this candidate to finish the escort to hospital
        req_battery = (dist_to_hospital_km * spec.consumptionRatePerKm) + spec.minimumReservePercent

        if battery >= req_battery:
            # Score candidate: battery headroom + proximity
            battery_headroom = battery - req_battery
            score = round(min(100.0, 50.0 + (battery_headroom * 1.5)), 1)

            candidates.append({
                'droneCode': code,
                'name': d.get('name') or spec.name,
                'model': spec.model,
                'battery': battery,
                'requiredBattery': round(req_battery, 1),
                'headroom': round(battery_headroom, 1),
                'distanceToHospitalKm': round(dist_to_hospital_km, 1),
                'score': score,
                'mode': mode,
                'zoneCode': d.get('zoneCode', spec.zoneCode),
            })

    # Sort candidates by score descending
    candidates.sort(key=lambda c: c['score'], reverse=True)
    return candidates
