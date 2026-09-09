from __future__ import annotations
from datetime import datetime, timezone
import uuid
from typing import List, Optional, Literal
from .models import AuditEntry

MAX_AUDIT_ENTRIES = 200
_audit_log: List[AuditEntry] = []


def log_audit(
    agent: Literal['DRONE_ASSIGNMENT_AGENT', 'INCIDENT_AGENT', 'OPERATOR', 'SYSTEM'],
    event_type: str,
    headline: str,
    details: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    simulated_time_iso: Optional[str] = None,
) -> AuditEntry:
    now_iso = datetime.now(timezone.utc).isoformat()
    entry = AuditEntry(
        id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
        timestampIso=now_iso,
        simulatedTimeIso=simulated_time_iso or now_iso,
        agent=agent,
        type=event_type,
        headline=headline,
        details=details,
        relatedEntityId=related_entity_id,
    )
    _audit_log.insert(0, entry)
    if len(_audit_log) > MAX_AUDIT_ENTRIES:
        _audit_log.pop()
    return entry


def get_audit_log(limit: int = 100) -> List[AuditEntry]:
    return _audit_log[:limit]


def clear_audit_log() -> None:
    _audit_log.clear()
