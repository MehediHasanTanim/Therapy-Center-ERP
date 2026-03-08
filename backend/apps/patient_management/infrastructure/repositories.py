from datetime import date
from uuid import UUID

from django.db.models import Max

from apps.patient_management.domain.entities import PatientDocumentEntity, PatientEntity
from apps.patient_management.domain.repositories import PatientRepository

from .models import Patient, PatientDocument


def _to_document_entity(model: PatientDocument) -> PatientDocumentEntity:
    file_url = model.file.url if model.file else None
    return PatientDocumentEntity(
        id=model.id,
        patient_id=model.patient_id,
        file_name=model.file_name,
        content_type=model.content_type,
        size=model.size,
        version=model.version,
        uploaded_at=model.uploaded_at,
        file_url=file_url,
    )


def _to_entity(model: Patient) -> PatientEntity:
    docs = [_to_document_entity(doc) for doc in model.documents.all()]
    return PatientEntity(
        id=model.id,
        full_name=model.full_name,
        parent_name=model.parent_name,
        spectrum=model.spectrum,
        date_of_birth=model.date_of_birth,
        phone=model.phone,
        address=model.address,
        notes=model.notes,
        created_at=model.created_at,
        updated_at=model.updated_at,
        documents=docs,
    )


class DjangoPatientRepository(PatientRepository):
    def list_all(self) -> list[PatientEntity]:
        queryset = Patient.objects.prefetch_related("documents").order_by("-created_at")
        return [_to_entity(item) for item in queryset]

    def get_by_id(self, patient_id: UUID) -> PatientEntity | None:
        model = Patient.objects.prefetch_related("documents").filter(id=patient_id).first()
        return _to_entity(model) if model else None

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
        model = Patient.objects.create(
            full_name=full_name,
            parent_name=parent_name,
            spectrum=spectrum,
            date_of_birth=date_of_birth,
            phone=phone,
            address=address,
            notes=notes,
        )
        model = Patient.objects.prefetch_related("documents").get(id=model.id)
        return _to_entity(model)

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
        model = Patient.objects.get(id=patient_id)
        model.full_name = full_name
        model.parent_name = parent_name
        model.spectrum = spectrum
        model.date_of_birth = date_of_birth
        model.phone = phone
        model.address = address
        model.notes = notes
        model.save(update_fields=["full_name", "parent_name", "spectrum", "date_of_birth", "phone", "address", "notes", "updated_at"])
        model = Patient.objects.prefetch_related("documents").get(id=patient_id)
        return _to_entity(model)

    def delete(self, patient_id: UUID) -> None:
        Patient.objects.filter(id=patient_id).delete()

    def add_document(self, *, patient_id: UUID, file_name: str, content_type: str, size: int, uploaded_file) -> PatientDocumentEntity:
        patient = Patient.objects.select_for_update().get(id=patient_id)
        max_version = (
            PatientDocument.objects.filter(patient_id=patient_id).aggregate(max_version=Max("version")).get("max_version") or 0
        )
        document = PatientDocument.objects.create(
            patient=patient,
            file_name=file_name,
            content_type=content_type,
            size=size,
            file=uploaded_file,
            version=max_version + 1,
        )
        return _to_document_entity(document)

    def delete_document(self, *, patient_id: UUID, document_id: UUID) -> bool:
        document = PatientDocument.objects.filter(id=document_id, patient_id=patient_id).first()
        if document is None:
            return False
        if document.file:
            document.file.delete(save=False)
        document.delete()
        return True
