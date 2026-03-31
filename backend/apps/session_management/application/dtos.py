from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(slots=True)
class CreateSessionCommand:
    patient_id: UUID
    therapist_id: UUID
    therapy_type: str
    title: str
    starts_at: datetime
    ends_at: datetime
    type: str
    cancellation_reason: str | None = None
    no_show_reason: str | None = None
    recurrence: dict | None = None


@dataclass(slots=True)
class RescheduleSessionCommand:
    session_id: UUID
    starts_at: datetime
    ends_at: datetime
