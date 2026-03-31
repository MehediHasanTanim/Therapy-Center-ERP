from dataclasses import dataclass
from uuid import UUID


@dataclass(slots=True)
class CreatePaymentCommand:
    patient_id: UUID
    session_id: UUID | None
    amount: float
    method: str

