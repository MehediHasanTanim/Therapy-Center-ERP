from dataclasses import dataclass
from datetime import date
from uuid import UUID


@dataclass(slots=True)
class CreateEmployeeCommand:
    user_id: UUID
    full_name: str
    phone: str
    address: str | None
    date_of_birth: date | None
    national_id: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    status: str
    job_title: str
    department: str
    employment_type: str
    join_date: date
    end_date: date | None
    manager_id: UUID | None
    notes: str | None
    compensation: dict | None
    role: str | None


@dataclass(slots=True)
class UpdateEmployeeCommand:
    employee_id: UUID
    full_name: str
    phone: str
    address: str | None
    date_of_birth: date | None
    national_id: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    status: str
    job_title: str
    department: str
    employment_type: str
    join_date: date
    end_date: date | None
    manager_id: UUID | None
    notes: str | None
    compensation: dict | None
    role: str | None


@dataclass(slots=True)
class UploadEmployeeDocumentCommand:
    employee_id: UUID
    file_name: str
    content_type: str
    size: int
    doc_type: str
    uploaded_file: object
    uploaded_by_id: UUID | None
