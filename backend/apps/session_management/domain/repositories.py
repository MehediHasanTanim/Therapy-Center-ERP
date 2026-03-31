from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from .entities import SessionEntity


class SessionRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[SessionEntity]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, session_id: UUID) -> SessionEntity | None:
        raise NotImplementedError

    @abstractmethod
    def patient_exists(self, patient_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def therapist_exists(self, therapist_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def therapist_specialty(self, therapist_id: UUID) -> str | None:
        raise NotImplementedError

    @abstractmethod
    def has_therapist_conflict(
        self, *, therapist_id: UUID, starts_at: datetime, ends_at: datetime, exclude_session_id: UUID | None = None
    ) -> bool:
        raise NotImplementedError

    @abstractmethod
    def add(
        self,
        *,
        patient_id: UUID,
        therapist_id: UUID,
        therapy_type: str,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        status: str,
        type: str,
        cancellation_reason: str | None = None,
        no_show_reason: str | None = None,
    ) -> SessionEntity:
        raise NotImplementedError

    @abstractmethod
    def reschedule(self, *, session_id: UUID, starts_at: datetime, ends_at: datetime) -> SessionEntity:
        raise NotImplementedError

    @abstractmethod
    def update_status(
        self,
        *,
        session_id: UUID,
        status: str,
        cancellation_reason: str | None = None,
        no_show_reason: str | None = None,
    ) -> SessionEntity:
        raise NotImplementedError

    @abstractmethod
    def delete(self, session_id: UUID) -> None:
        raise NotImplementedError

    @abstractmethod
    def log_conflict(
        self,
        *,
        patient_id: UUID,
        therapist_id: UUID,
        therapy_type: str,
        session_type: str,
        starts_at: datetime,
        ends_at: datetime,
        action: str,
        reason: str,
    ) -> None:
        raise NotImplementedError
