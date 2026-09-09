from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv
from .models import AgentConfigModel

# Load .env from ai_service, backend, or project root
root_dir = Path(__file__).resolve().parent.parent
load_dotenv(root_dir / 'ai_service' / '.env')
load_dotenv(root_dir / '.env')
load_dotenv(root_dir / 'backend' / '.env')

BACKEND_URL = os.environ.get('BACKEND_URL', 'http://127.0.0.1:4000')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY') or ''
PORT = int(os.environ.get('AGENT_SERVICE_PORT', '8000'))
HOST = os.environ.get('AGENT_SERVICE_HOST', '127.0.0.1')

# Centralized Agent Configuration with configurable weights
current_config = AgentConfigModel(
    minimumBattery=float(os.environ.get('MINIMUM_BATTERY', '25.0')),
    distanceWeight=float(os.environ.get('DISTANCE_WEIGHT', '0.35')),
    etaWeight=float(os.environ.get('ETA_WEIGHT', '0.25')),
    batteryWeight=float(os.environ.get('BATTERY_WEIGHT', '0.20')),
    missionPriorityWeight=float(os.environ.get('MISSION_PRIORITY_WEIGHT', '0.10')),
    zoneWeight=float(os.environ.get('ZONE_WEIGHT', '0.10')),
    incidentObservingThresholdMin=float(os.environ.get('INCIDENT_OBSERVING_MIN', '5.0')),
    incidentInvestigationThresholdMin=float(os.environ.get('INCIDENT_INVESTIGATION_MIN', '15.0')),
    incidentEscalationThresholdMin=float(os.environ.get('INCIDENT_ESCALATION_MIN', '60.0')),
    autoApproveDroneDispatch=os.environ.get('AUTO_APPROVE_DRONE', 'false').lower() == 'true',
    autoApprovePoliceDispatch=os.environ.get('AUTO_APPROVE_POLICE', 'false').lower() == 'true',
    geminiModel=os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash'),
)


def get_config() -> AgentConfigModel:
    return current_config


def update_config(new_config: AgentConfigModel) -> AgentConfigModel:
    global current_config
    current_config = new_config
    return current_config
