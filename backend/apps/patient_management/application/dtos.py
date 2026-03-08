from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID


@dataclass(slots=True)
class CreatePatientCommand:
    full_name: str
    parent_name: str
    spectrum: str
    date_of_birth: date
    phone: str
    address: str
    notes: str | None = None


@dataclass(slots=True)
class UpdatePatientCommand:
    patient_id: UUID
    full_name: str
    parent_name: str
    spectrum: str
    date_of_birth: date
    phone: str
    address: str
    notes: str | None = None


@dataclass(slots=True)
class UploadPatientDocumentCommand:
    patient_id: UUID
    file_name: str
    content_type: str
    size: int
    uploaded_file: Any
