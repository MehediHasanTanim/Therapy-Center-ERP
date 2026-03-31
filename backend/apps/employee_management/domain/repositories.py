from abc import ABC, abstractmethod
from datetime import date
from typing import Iterable
from uuid import UUID

from .entities import EmployeeCompensationEntity, EmployeeDocumentEntity, EmployeeEntity


class EmployeeRepository(ABC):
    @abstractmethod
    def list_all(self, *, search: str | None, status: str | None, department: str | None, employment_type: str | None, sort_by: str | None, sort_dir: str | None) -> list[EmployeeEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_paginated(
        self,
        *,
        search: str | None,
        status: str | None,
        department: str | None,
        employment_type: str | None,
        sort_by: str | None,
        sort_dir: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[EmployeeEntity], int]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, employee_id: UUID) -> EmployeeEntity | None:
        raise NotImplementedError

    @abstractmethod
    def user_exists(self, user_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def user_linked(self, user_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def add(
        self,
        *,
        user_id: UUID,
        full_name: str,
        phone: str,
        address: str | None,
        date_of_birth: date | None,
        national_id: str | None,
        emergency_contact_name: str | None,
        emergency_contact_phone: str | None,
        status: str,
        job_title: str,
        department: str,
        employment_type: str,
        join_date: date,
        end_date: date | None,
        manager_id: UUID | None,
        notes: str | None,
        compensation: dict | None,
    ) -> EmployeeEntity:
        raise NotImplementedError

    @abstractmethod
    def update(
        self,
        *,
        employee_id: UUID,
        full_name: str,
        phone: str,
        address: str | None,
        date_of_birth: date | None,
        national_id: str | None,
        emergency_contact_name: str | None,
        emergency_contact_phone: str | None,
        status: str,
        job_title: str,
        department: str,
        employment_type: str,
        join_date: date,
        end_date: date | None,
        manager_id: UUID | None,
        notes: str | None,
        compensation: dict | None,
    ) -> EmployeeEntity:
        raise NotImplementedError

    @abstractmethod
    def deactivate(self, employee_id: UUID, end_date: date | None) -> EmployeeEntity:
        raise NotImplementedError

    @abstractmethod
    def add_document(
        self,
        *,
        employee_id: UUID,
        file_name: str,
        content_type: str,
        size: int,
        doc_type: str,
        uploaded_file,
        uploaded_by_id: UUID | None,
    ) -> EmployeeDocumentEntity:
        raise NotImplementedError

    @abstractmethod
    def delete_document(self, *, employee_id: UUID, document_id: UUID) -> bool:
        raise NotImplementedError

    @abstractmethod
    def active_compensation(self, employee_id: UUID) -> EmployeeCompensationEntity | None:
        raise NotImplementedError

    @abstractmethod
    def list_documents(self, employee_id: UUID) -> Iterable[EmployeeDocumentEntity]:
        raise NotImplementedError

    @abstractmethod
    def update_user_role(self, user_id: UUID, role: str | None, full_name: str | None) -> None:
        raise NotImplementedError
