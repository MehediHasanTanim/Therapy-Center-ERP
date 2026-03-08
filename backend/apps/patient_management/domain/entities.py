from dataclasses import dataclass, field
from datetime import date, datetime
from uuid import UUID


@dataclass(slots=True)
class PatientDocumentEntity:
    id: UUID
    patient_id: UUID
    file_name: str
    content_type: str
    size: int
    version: int
    uploaded_at: datetime
    file_url: str | None = None


@dataclass(slots=True)
class PatientEntity:
    id: UUID
    full_name: str
    parent_name: str
    spectrum: str
    date_of_birth: date
    phone: str
    address: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    documents: list[PatientDocumentEntity] = field(default_factory=list)
