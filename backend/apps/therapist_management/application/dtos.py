from dataclasses import dataclass
from uuid import UUID


@dataclass(slots=True)
class AvailabilitySlotInput:
    day_of_week: int
    start_hour: str
    end_hour: str


@dataclass(slots=True)
class CreateTherapistCommand:
    full_name: str
    specialty: str
    availability: list[AvailabilitySlotInput]
    payout_percentage: float | None = None


@dataclass(slots=True)
class UpdateTherapistCommand:
    therapist_id: UUID
    full_name: str
    specialty: str
    availability: list[AvailabilitySlotInput]
    payout_percentage: float | None = None
