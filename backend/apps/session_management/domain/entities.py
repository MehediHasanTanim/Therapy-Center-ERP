from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(slots=True)
class SessionEntity:
    id: UUID
    patient_id: UUID
    therapist_id: UUID
    therapy_type: str
    title: str
    starts_at: datetime
    ends_at: datetime
    status: str
    type: str
    cancellation_reason: str | None
    no_show_reason: str | None
    created_at: datetime
    updated_at: datetime
