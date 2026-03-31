from datetime import date
from uuid import UUID

from apps.employee_management.application.dtos import CreateEmployeeCommand, UpdateEmployeeCommand, UploadEmployeeDocumentCommand
from apps.employee_management.application.unit_of_work import AbstractUnitOfWork
from apps.employee_management.domain.entities import EmployeeDocumentEntity, EmployeeEntity
from apps.employee_management.domain.exceptions import NotFoundError, ValidationError
from apps.employee_management.domain.value_objects import Department, EmploymentStatus, EmploymentType, PayType
from apps.user_management.domain.value_objects import UserRole


class EmployeeManagementUseCases:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    def list_employees(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        department: str | None = None,
        employment_type: str | None = None,
        sort_by: str | None = None,
        sort_dir: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> tuple[list[EmployeeEntity], int]:
        with self.uow:
            if page and page_size:
                return self.uow.employees.list_paginated(
                    search=search,
                    status=status,
                    department=department,
                    employment_type=employment_type,
                    sort_by=sort_by,
                    sort_dir=sort_dir,
                    page=page,
                    page_size=page_size,
                )
            employees = self.uow.employees.list_all(
                search=search,
                status=status,
                department=department,
                employment_type=employment_type,
                sort_by=sort_by,
                sort_dir=sort_dir,
            )
            return employees, len(employees)

    def get_employee(self, employee_id: UUID) -> EmployeeEntity:
        with self.uow:
            employee = self.uow.employees.get_by_id(employee_id)
            if employee is None:
                raise NotFoundError("Employee not found")
            return employee

    def create_employee(self, command: CreateEmployeeCommand) -> EmployeeEntity:
        self._validate_common(command.status, command.department, command.employment_type, command.join_date, command.end_date)
        self._validate_compensation(command.compensation)

        with self.uow:
            if not self.uow.employees.user_exists(command.user_id):
                raise NotFoundError("User not found")
            if self.uow.employees.user_linked(command.user_id):
                raise ValidationError("User is already linked to an employee")

            employee = self.uow.employees.add(
                user_id=command.user_id,
                full_name=command.full_name,
                phone=command.phone,
                address=command.address,
                date_of_birth=command.date_of_birth,
                national_id=command.national_id,
                emergency_contact_name=command.emergency_contact_name,
                emergency_contact_phone=command.emergency_contact_phone,
                status=command.status,
                job_title=command.job_title,
                department=command.department,
                employment_type=command.employment_type,
                join_date=command.join_date,
                end_date=command.end_date,
                manager_id=command.manager_id,
                notes=command.notes,
                compensation=command.compensation,
            )

            if command.role:
                self._validate_role(command.role)
                self.uow.employees.update_user_role(command.user_id, command.role, command.full_name)
            else:
                self.uow.employees.update_user_role(command.user_id, None, command.full_name)
            self.uow.commit()
            return employee

    def update_employee(self, command: UpdateEmployeeCommand) -> EmployeeEntity:
        self._validate_common(command.status, command.department, command.employment_type, command.join_date, command.end_date)
        self._validate_compensation(command.compensation)

        with self.uow:
            existing = self.uow.employees.get_by_id(command.employee_id)
            if existing is None:
                raise NotFoundError("Employee not found")

            employee = self.uow.employees.update(
                employee_id=command.employee_id,
                full_name=command.full_name,
                phone=command.phone,
                address=command.address,
                date_of_birth=command.date_of_birth,
                national_id=command.national_id,
                emergency_contact_name=command.emergency_contact_name,
                emergency_contact_phone=command.emergency_contact_phone,
                status=command.status,
                job_title=command.job_title,
                department=command.department,
                employment_type=command.employment_type,
                join_date=command.join_date,
                end_date=command.end_date,
                manager_id=command.manager_id,
                notes=command.notes,
                compensation=command.compensation,
            )

            if command.role:
                self._validate_role(command.role)
                self.uow.employees.update_user_role(employee.user_id, command.role, command.full_name)
            else:
                self.uow.employees.update_user_role(employee.user_id, None, command.full_name)
            self.uow.commit()
            return employee

    def deactivate_employee(self, employee_id: UUID, end_date: date | None) -> EmployeeEntity:
        with self.uow:
            existing = self.uow.employees.get_by_id(employee_id)
            if existing is None:
                raise NotFoundError("Employee not found")
            employee = self.uow.employees.deactivate(employee_id, end_date)
            self.uow.commit()
            return employee

    def upload_document(self, command: UploadEmployeeDocumentCommand) -> EmployeeDocumentEntity:
        if command.size <= 0:
            raise ValidationError("Document size must be greater than 0")
        if len(command.file_name.strip()) == 0:
            raise ValidationError("File name is required")

        with self.uow:
            existing = self.uow.employees.get_by_id(command.employee_id)
            if existing is None:
                raise NotFoundError("Employee not found")
            document = self.uow.employees.add_document(
                employee_id=command.employee_id,
                file_name=command.file_name,
                content_type=command.content_type,
                size=command.size,
                doc_type=command.doc_type,
                uploaded_file=command.uploaded_file,
                uploaded_by_id=command.uploaded_by_id,
            )
            self.uow.commit()
            return document

    def delete_document(self, *, employee_id: UUID, document_id: UUID) -> None:
        with self.uow:
            existing = self.uow.employees.get_by_id(employee_id)
            if existing is None:
                raise NotFoundError("Employee not found")
            deleted = self.uow.employees.delete_document(employee_id=employee_id, document_id=document_id)
            if not deleted:
                raise NotFoundError("Document not found")
            self.uow.commit()

    @staticmethod
    def _validate_common(status: str, department: str, employment_type: str, join_date: date, end_date: date | None) -> None:
        if status not in EmploymentStatus.values():
            raise ValidationError("Invalid status")
        if department not in Department.values():
            raise ValidationError("Invalid department")
        if employment_type not in EmploymentType.values():
            raise ValidationError("Invalid employment type")
        if end_date and end_date < join_date:
            raise ValidationError("End date must be after join date")

    @staticmethod
    def _validate_compensation(compensation: dict | None) -> None:
        if not compensation:
            return
        pay_type = compensation.get("payType")
        if pay_type not in PayType.values():
            raise ValidationError("Invalid pay type")
        base_rate = compensation.get("baseRate")
        if base_rate is None or float(base_rate) < 0:
            raise ValidationError("Base rate must be a positive number")

    @staticmethod
    def _validate_role(role: str) -> None:
        if role not in UserRole.values():
            raise ValidationError("Invalid role")
