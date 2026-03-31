from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(slots=True)
class PaymentEntity:
    id: UUID
    patient_id: UUID
    session_id: UUID | None
    amount: float
    method: str
    created_at: datetime

