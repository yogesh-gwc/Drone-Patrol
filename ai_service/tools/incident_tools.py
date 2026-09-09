from __future__ import annotations
import math
from typing import List, Dict, Any, Optional
from ..config import get_config

# Perandapalli node chainage reference along NH-44
PERANDAPALLI_CHAINAGE_M = 37_200.0
CONGESTION_SPAN_M = 2_600.0


def get_vehicle_context(
    vehicle: Dict[str, Any],
    all_vehicles: List[Dict[str, Any]],
    ambulance_state: Optional[Dict[str, Any]] = None,
    sos_state: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Gathers comprehensive contextual evidence around a vehicle on NH-44.
    """
    code = vehicle.get('code', '')
    kind = vehicle.get('kind', 'CAR')
    stopped = vehicle.get('stopped', False)
    stopped_minutes = float(vehicle.get('stoppedMinutes', 0.0))
    chainage = float(vehicle.get('distanceAlongMeters', 0.0))
    pos = vehicle.get('position', [0.0, 0.0])
    lane_offset = float(vehicle.get('laneOffsetMeters', 0.0))
    yielding = vehicle.get('yielding', False)

    # Road position: lane offset near shoulder factor is 0 (hard shoulder), else running lane
    is_shoulder = abs(lane_offset) < 5.0 or (vehicle.get('stopped') and abs(lane_offset) <= 6.0)
    lane_idx = 0 if is_shoulder else 1

    # Sector name along corridor
    sector_name = _get_sector_name(chainage)

    # Evaluate surrounding traffic within 1.5 km
    nearby_count = 0
    nearby_speeds = []
    for other in all_vehicles:
        if other.get('code') == code:
            continue
        other_dist = abs(float(other.get('distanceAlongMeters', 0.0)) - chainage)
        if other_dist <= 1500.0:
            nearby_count += 1
            nearby_speeds.append(float(other.get('speedKmh', 80.0)))

    avg_speed = sum(nearby_speeds) / max(1, len(nearby_speeds)) if nearby_speeds else 80.0

    # Traffic density
    is_in_perandapalli = abs(chainage - PERANDAPALLI_CHAINAGE_M) <= (CONGESTION_SPAN_M / 2.0)
    if is_in_perandapalli or avg_speed < 35.0 or nearby_count > 15:
        traffic_density = 'CONGESTED'
    elif nearby_count > 7:
        traffic_density = 'MODERATE'
    else:
        traffic_density = 'LIGHT'

    # Traffic impact
    if not is_shoulder and stopped:
        traffic_impact = 'HIGH' if traffic_density in ['MODERATE', 'CONGESTED'] else 'MEDIUM'
    elif stopped_minutes >= 60.0:
        traffic_impact = 'MEDIUM'
    else:
        traffic_impact = 'LOW'

    # Check nearby active emergencies
    nearby_emergencies = False
    if ambulance_state and ambulance_state.get('active'):
        amb_chainage = float(ambulance_state.get('startChainageMeters', 0.0))
        if abs(amb_chainage - chainage) <= 3000.0 or yielding:
            nearby_emergencies = True

    if sos_state and sos_state.get('status') == 'ACTIVE':
        sos_pos = sos_state.get('position', [0.0, 0.0])
        from .drone_tools import meters_between
        if meters_between(pos, sos_pos) <= 3000.0:
            nearby_emergencies = True

    return {
        'vehicleCode': code,
        'vehicleKind': kind,
        'stopped': stopped,
        'stoppedDurationMinutes': stopped_minutes,
        'chainageMeters': chainage,
        'position': pos,
        'sectorName': sector_name,
        'lane': lane_idx,
        'isShoulder': is_shoulder,
        'trafficDensity': traffic_density,
        'trafficImpact': traffic_impact,
        'nearbyEmergencies': nearby_emergencies,
        'yielding': yielding,
        'nearbyCount': nearby_count,
        'averageTrafficSpeedKmh': avg_speed,
    }


def evaluate_stoppage_anomaly(context: Dict[str, Any]) -> str:
    """
    Evaluates context to decide whether a stoppage is NORMAL, an OBSERVED potential anomaly,
    or warrants an immediate DRONE INVESTIGATION.
    """
    stopped = context.get('stopped', False)
    if not stopped:
        return 'NORMAL'

    yielding = context.get('yielding', False)
    if yielding:
        # Legitimate temporary stop to yield passage to emergency ambulance
        return 'NORMAL'

    duration = context.get('stoppedDurationMinutes', 0.0)
    is_shoulder = context.get('isShoulder', True)
    traffic_impact = context.get('trafficImpact', 'LOW')

    # If vehicle stopped in an active running lane (hazardous!)
    if not is_shoulder:
        if duration >= 2.0:
            return 'INVESTIGATE'
        return 'POTENTIAL'

    # If stopped on hard shoulder
    if duration >= 15.0:
        return 'INVESTIGATE'
    elif duration >= 5.0:
        return 'POTENTIAL'

    return 'NORMAL'


def _get_sector_name(chainage_meters: float) -> str:
    # 5 corridor nodes
    nodes = [
        (0.0, 'Krishnagiri'),
        (12_000.0, 'Kurubarapalli'),
        (25_000.0, 'Shoolagiri'),
        (37_200.0, 'Perandapalli'),
        (48_500.0, 'Hosur'),
    ]
    best_name = 'Krishnagiri'
    best_diff = float('inf')
    for d, name in nodes:
        diff = abs(chainage_meters - d)
        if diff < best_diff:
            best_diff = diff
            best_name = name
    return best_name
