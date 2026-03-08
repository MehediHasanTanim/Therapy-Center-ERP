from abc import ABC, abstractmethod
from typing import Any
from datetime import date
from uuid import UUID

from .entities import PatientDocumentEntity, PatientEntity


class PatientRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[PatientEntity]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, patient_id: UUID) -> PatientEntity | None:
        raise NotImplementedError

    @abstractmethod
    def add(
        self,
        *,
        full_name: str,
        parent_name: str,
        spectrum: str,
        date_of_birth: date,
        phone: str,
        address: str,
        notes: str | None,
    ) -> PatientEntity:
        raise NotImplementedError

    @abstractmethod
    def update(
        self,
        *,
        patient_id: UUID,
        full_name: str,
        parent_name: str,
        spectrum: str,
        date_of_birth: date,
        phone: str,
        address: str,
        notes: str | None,
    ) -> PatientEntity:
        raise NotImplementedError

    @abstractmethod
    def delete(self, patient_id: UUID) -> None:
        raise NotImplementedError

    @abstractmethod
    def add_document(self, *, patient_id: UUID, file_name: str, content_type: str, size: int, uploaded_file: Any) -> PatientDocumentEntity:
        raise NotImplementedError

    @abstractmethod
    def delete_document(self, *, patient_id: UUID, document_id: UUID) -> bool:
        raise NotImplementedError
