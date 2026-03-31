from abc import ABC, abstractmethod
from uuid import UUID

from .entities import AvailabilitySlotEntity, TherapistEntity


class TherapistRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[TherapistEntity]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, therapist_id: UUID) -> TherapistEntity | None:
        raise NotImplementedError

    @abstractmethod
    def add(
        self,
        *,
        full_name: str,
        specialty: str,
        availability: list[AvailabilitySlotEntity],
        payout_percentage: float,
    ) -> TherapistEntity:
        raise NotImplementedError

    @abstractmethod
    def update(
        self,
        *,
        therapist_id: UUID,
        full_name: str,
        specialty: str,
        availability: list[AvailabilitySlotEntity],
        payout_percentage: float,
    ) -> TherapistEntity:
        raise NotImplementedError

    @abstractmethod
    def delete(self, therapist_id: UUID) -> None:
        raise NotImplementedError
