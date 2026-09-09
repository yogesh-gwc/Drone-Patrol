from __future__ import annotations
import math
from typing import List, Dict, Any, Optional, Tuple
from ..models import DroneCandidate, DroneStateModel
from ..config import get_config

EARTH_RADIUS_M = 6_371_000
DRONE_TRANSIT_SPEED_MPS = 38.0  # Demonstrable transit dash speed (approx 136 km/h)
MAX_CORRIDOR_SPAN_M = 55_000.0  # Approx 50 km corridor


def meters_between(a: List[float], b: List[float]) -> float:
    """Great-circle distance in metres between two [lng, lat] coordinates."""
    lon1, lat1 = a[0], a[1]
    lon2, lat2 = b[0], b[1]
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    h = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(min(1.0, h)))


def calculate_drone_distance(drone_pos: List[float], target_pos: List[float]) -> float:
    return meters_between(drone_pos, target_pos)


def calculate_drone_eta(distance_meters: float, speed_mps: float = DRONE_TRANSIT_SPEED_MPS) -> float:
    return distance_meters / max(1.0, speed_mps)


def rank_candidate_drones(
    drones: List[Dict[str, Any]],
    target_pos: List[float],
    target_zone: Optional[str] = None,
    required_mission: str = 'SOS_TRACKING',
) -> List[DroneCandidate]:
    """
    Deterministically evaluates and ranks all 10 drones based on multi-criteria suitability.
    Disqualifies drones that are charging, low battery, offline, or handling higher-priority missions.
    """
    config = get_config()
    candidates: List[DroneCandidate] = []

    for d in drones:
        code = d.get('code', '')
        name = d.get('name', f"Drone {code}")
        battery = float(d.get('batteryPercentage', 0.0))
        mode = d.get('mode', 'PATROLLING')
        zone_code = d.get('zoneCode', '')
        pos = d.get('position', [0.0, 0.0])

        dist_m = meters_between(pos, target_pos)
        eta_s = calculate_drone_eta(dist_m)

        # Eligibility evaluation
        eligible = True
        disqualification_reason = None

        if mode == 'OFFLINE':
            eligible = False
            disqualification_reason = "Drone is offline and unreachable"
        elif mode == 'CHARGING' or d.get('stationCode') is not None:
            eligible = False
            disqualification_reason = f"Drone is currently docked/charging at {d.get('stationCode', 'station')}"
        elif battery < config.minimumBattery:
            eligible = False
            disqualification_reason = f"Battery level ({battery:.0f}%) is below minimum operational threshold ({config.minimumBattery:.0f}%)"
        elif mode == 'ESCORTING':
            eligible = False
            disqualification_reason = "Drone is engaged in higher-priority ambulance priority escort"
        elif mode == 'SOS_TRACKING' and required_mission != 'SOS_TRACKING':
            eligible = False
            disqualification_reason = "Drone is committed to an active person-in-distress SOS tracking mission"

        # Deterministic scoring components
        # 1. Distance score (0-100)
        dist_score = max(0.0, min(100.0, 100.0 - (dist_m / MAX_CORRIDOR_SPAN_M) * 100.0))

        # 2. ETA score (0-100)
        max_eta = MAX_CORRIDOR_SPAN_M / DRONE_TRANSIT_SPEED_MPS
        eta_score = max(0.0, min(100.0, 100.0 - (eta_s / max_eta) * 100.0))

        # 3. Battery score (0-100)
        battery_score = max(0.0, min(100.0, battery))

        # 4. Mission priority score
        if mode == 'PATROLLING' or mode == 'RETURNING':
            mission_score = 100.0
        elif mode == 'MONITORING':
            mission_score = 65.0  # Can be reassigned to higher priority emergency
        else:
            mission_score = 0.0

        # 5. Zone proximity score
        zone_score = 60.0
        if target_zone and zone_code:
            try:
                z_target = int(target_zone.replace('Z-', ''))
                z_drone = int(zone_code.replace('Z-', ''))
                z_diff = abs(z_target - z_drone)
                if z_diff == 0:
                    zone_score = 100.0
                elif z_diff == 1:
                    zone_score = 85.0
                elif z_diff <= 2:
                    zone_score = 70.0
                else:
                    zone_score = 40.0
            except ValueError:
                zone_score = 60.0

        weight_sum = (
            config.distanceWeight
            + config.etaWeight
            + config.batteryWeight
            + config.missionPriorityWeight
            + config.zoneWeight
        )

        total_score = (
            dist_score * config.distanceWeight
            + eta_score * config.etaWeight
            + battery_score * config.batteryWeight
            + mission_score * config.missionPriorityWeight
            + zone_score * config.zoneWeight
        ) / max(0.01, weight_sum)

        if not eligible:
            total_score = 0.0

        candidates.append(
            DroneCandidate(
                droneCode=code,
                name=name,
                battery=battery,
                distanceMeters=round(dist_m, 1),
                etaSeconds=round(eta_s, 1),
                mode=mode,
                zoneCode=zone_code,
                eligible=eligible,
                disqualificationReason=disqualification_reason,
                score=round(total_score, 1),
                scoreBreakdown={
                    'distanceScore': round(dist_score, 1),
                    'etaScore': round(eta_score, 1),
                    'batteryScore': round(battery_score, 1),
                    'missionScore': round(mission_score, 1),
                    'zoneScore': round(zone_score, 1),
                },
            )
        )

    # Sort eligible candidates by score descending, then ineligible candidates at the bottom
    candidates.sort(key=lambda c: (1 if c.eligible else 0, c.score), reverse=True)

    for i, c in enumerate(candidates):
        c.rank = i + 1

    return candidates
