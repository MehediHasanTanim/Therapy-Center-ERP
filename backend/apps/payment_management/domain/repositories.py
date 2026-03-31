from abc import ABC, abstractmethod
from uuid import UUID

from .entities import PaymentEntity


class PaymentRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[PaymentEntity]:
        raise NotImplementedError

    @abstractmethod
    def add(self, *, patient_id: UUID, session_id: UUID | None, amount: float, method: str) -> PaymentEntity:
        raise NotImplementedError

    @abstractmethod
    def patient_exists(self, patient_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def session_exists(self, session_id: UUID) -> bool:
        raise NotImplementedError

