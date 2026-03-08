from dataclasses import replace
from datetime import date, datetime
from uuid import uuid4

import pytest

from apps.patient_management.application.dtos import CreatePatientCommand, UploadPatientDocumentCommand
from apps.patient_management.application.unit_of_work import AbstractUnitOfWork
from apps.patient_management.application.use_cases import PatientManagementUseCases
from apps.patient_management.domain.entities import PatientDocumentEntity, PatientEntity
from apps.patient_management.domain.exceptions import NotFoundError, ValidationError
from apps.patient_management.domain.repositories import PatientRepository
from apps.patient_management.domain.value_objects import Spectrum


class InMemoryPatientRepository(PatientRepository):
    def __init__(self):
        self.items: dict = {}
        self.documents: dict = {}

    def list_all(self):
        return list(self.items.values())

    def get_by_id(self, patient_id):
        return self.items.get(patient_id)

    def add(self, *, full_name, parent_name, spectrum, date_of_birth, phone, address, notes):
        entity = PatientEntity(
            id=uuid4(),
            full_name=full_name,
            parent_name=parent_name,
            spectrum=spectrum,
            date_of_birth=date_of_birth,
            phone=phone,
            address=address,
            notes=notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            documents=[],
        )
        self.items[entity.id] = entity
        self.documents[entity.id] = []
        return entity

    def update(self, *, patient_id, full_name, parent_name, spectrum, date_of_birth, phone, address, notes):
        old = self.items[patient_id]
        updated = replace(
            old,
            full_name=full_name,
            parent_name=parent_name,
            spectrum=spectrum,
            date_of_birth=date_of_birth,
            phone=phone,
            address=address,
            notes=notes,
            updated_at=datetime.utcnow(),
        )
        self.items[patient_id] = updated
        return updated

    def delete(self, patient_id):
        self.items.pop(patient_id, None)
        self.documents.pop(patient_id, None)

    def add_document(self, *, patient_id, file_name, content_type, size, uploaded_file):
        next_version = len(self.documents[patient_id]) + 1
        entity = PatientDocumentEntity(
            id=uuid4(),
            patient_id=patient_id,
            file_name=file_name,
            content_type=content_type,
            size=size,
            version=next_version,
            uploaded_at=datetime.utcnow(),
        )
        self.documents[patient_id].append(entity)
        patient = self.items[patient_id]
        self.items[patient_id] = replace(patient, documents=list(self.documents[patient_id]), updated_at=datetime.utcnow())
        return entity


class InMemoryUoW(AbstractUnitOfWork):
    def __init__(self):
        self.patients = InMemoryPatientRepository()
        self.committed = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def commit(self):
        self.committed = True

    def rollback(self):
        pass


@pytest.fixture
def use_cases():
    return PatientManagementUseCases(InMemoryUoW())


def test_create_patient_success(use_cases):
    patient = use_cases.create_patient(
        CreatePatientCommand(
            full_name="John Carter",
            parent_name="Michael Carter",
            spectrum=Spectrum.ASD.value,
            date_of_birth=date(2012, 4, 5),
            phone="+1555000111",
            address="123 Main St",
            notes="",
        )
    )
    assert patient.full_name == "John Carter"
    assert patient.spectrum == Spectrum.ASD.value


def test_create_patient_invalid_spectrum(use_cases):
    with pytest.raises(ValidationError):
        use_cases.create_patient(
            CreatePatientCommand(
                full_name="Jane",
                parent_name="Parent",
                spectrum="INVALID",
                date_of_birth=date(2010, 1, 1),
                phone="+1555000111",
                address="Street",
            )
        )


def test_upload_document_missing_patient(use_cases):
    with pytest.raises(NotFoundError):
        use_cases.upload_document(
            UploadPatientDocumentCommand(
                patient_id=uuid4(),
                file_name="report.pdf",
                content_type="application/pdf",
                size=1024,
                uploaded_file=object(),
            )
        )


def test_upload_document_version_increment(use_cases):
    patient = use_cases.create_patient(
        CreatePatientCommand(
            full_name="John Carter",
            parent_name="Michael Carter",
            spectrum=Spectrum.ASD.value,
            date_of_birth=date(2012, 4, 5),
            phone="+1555000111",
            address="123 Main St",
        )
    )

    first = use_cases.upload_document(
        UploadPatientDocumentCommand(
            patient_id=patient.id,
            file_name="report-1.pdf",
            content_type="application/pdf",
            size=1024,
            uploaded_file=object(),
        )
    )
    second = use_cases.upload_document(
        UploadPatientDocumentCommand(
            patient_id=patient.id,
            file_name="report-2.pdf",
            content_type="application/pdf",
            size=2048,
            uploaded_file=object(),
        )
    )

    assert first.version == 1
    assert second.version == 2
