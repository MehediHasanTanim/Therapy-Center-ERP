from uuid import UUID

from apps.patient_management.application.dtos import CreatePatientCommand, UpdatePatientCommand, UploadPatientDocumentCommand
from apps.patient_management.application.unit_of_work import AbstractUnitOfWork
from apps.patient_management.domain.entities import PatientDocumentEntity, PatientEntity
from apps.patient_management.domain.exceptions import NotFoundError, ValidationError
from apps.patient_management.domain.value_objects import Spectrum


class PatientManagementUseCases:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    def list_patients(self) -> list[PatientEntity]:
        with self.uow:
            return self.uow.patients.list_all()

    def get_patient(self, patient_id: UUID) -> PatientEntity:
        with self.uow:
            patient = self.uow.patients.get_by_id(patient_id)
            if patient is None:
                raise NotFoundError("Patient not found")
            return patient

    def create_patient(self, command: CreatePatientCommand) -> PatientEntity:
        self._validate_create_or_update(command.spectrum, command.phone)

        with self.uow:
            patient = self.uow.patients.add(
                full_name=command.full_name,
                parent_name=command.parent_name,
                spectrum=command.spectrum,
                date_of_birth=command.date_of_birth,
                phone=command.phone,
                address=command.address,
                notes=command.notes,
            )
            self.uow.commit()
            return patient

    def update_patient(self, command: UpdatePatientCommand) -> PatientEntity:
        self._validate_create_or_update(command.spectrum, command.phone)

        with self.uow:
            existing = self.uow.patients.get_by_id(command.patient_id)
            if existing is None:
                raise NotFoundError("Patient not found")
            patient = self.uow.patients.update(
                patient_id=command.patient_id,
                full_name=command.full_name,
                parent_name=command.parent_name,
                spectrum=command.spectrum,
                date_of_birth=command.date_of_birth,
                phone=command.phone,
                address=command.address,
                notes=command.notes,
            )
            self.uow.commit()
            return patient

    def delete_patient(self, patient_id: UUID) -> None:
        with self.uow:
            existing = self.uow.patients.get_by_id(patient_id)
            if existing is None:
                raise NotFoundError("Patient not found")
            self.uow.patients.delete(patient_id)
            self.uow.commit()

    def upload_document(self, command: UploadPatientDocumentCommand) -> PatientDocumentEntity:
        if command.size <= 0:
            raise ValidationError("Document size must be greater than 0")
        if len(command.file_name.strip()) == 0:
            raise ValidationError("File name is required")

        with self.uow:
            existing = self.uow.patients.get_by_id(command.patient_id)
            if existing is None:
                raise NotFoundError("Patient not found")
            document = self.uow.patients.add_document(
                patient_id=command.patient_id,
                file_name=command.file_name,
                content_type=command.content_type,
                size=command.size,
                uploaded_file=command.uploaded_file,
            )
            self.uow.commit()
            return document

    def delete_document(self, *, patient_id: UUID, document_id: UUID) -> None:
        with self.uow:
            existing = self.uow.patients.get_by_id(patient_id)
            if existing is None:
                raise NotFoundError("Patient not found")
            deleted = self.uow.patients.delete_document(patient_id=patient_id, document_id=document_id)
            if not deleted:
                raise NotFoundError("Document not found")
            self.uow.commit()

    @staticmethod
    def _validate_create_or_update(spectrum: str, phone: str) -> None:
        if spectrum not in Spectrum.values():
            raise ValidationError("Invalid spectrum value")
        if len(phone.strip()) < 7:
            raise ValidationError("Phone must be at least 7 characters")
