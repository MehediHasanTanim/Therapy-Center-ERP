from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass(slots=True)
class AvailabilitySlotEntity:
    day_of_week: int
    start_hour: str
    end_hour: str


@dataclass(slots=True)
class TherapistEntity:
    id: UUID
    full_name: str
    specialty: str
    payout_percentage: float
    created_at: datetime
    updated_at: datetime
    availability: list[AvailabilitySlotEntity] = field(default_factory=list)
