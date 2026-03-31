from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID


@dataclass(slots=True)
class EmployeeDocumentEntity:
    id: UUID
    employee_id: UUID
    file_name: str
    content_type: str
    size: int
    doc_type: str
    version: int
    uploaded_at: datetime
    file_url: str | None = None


@dataclass(slots=True)
class EmployeeCompensationEntity:
    id: UUID
    employee_id: UUID
    pay_type: str
    base_rate: float
    currency: str
    effective_from: date
    effective_to: date | None


@dataclass(slots=True)
class EmployeeEntity:
    id: UUID
    user_id: UUID
    email: str
    role: str
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
    created_at: datetime
    compensation: EmployeeCompensationEntity | None
    documents: list[EmployeeDocumentEntity]
