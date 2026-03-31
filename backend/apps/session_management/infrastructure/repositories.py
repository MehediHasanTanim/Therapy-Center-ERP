from datetime import datetime
from uuid import UUID

from apps.patient_management.infrastructure.models import Patient
from apps.session_management.domain.entities import SessionEntity
from apps.session_management.domain.repositories import SessionRepository
from apps.therapist_management.infrastructure.models import Therapist

from .models import Session, SessionConflictLog


def _to_entity(model: Session) -> SessionEntity:
    return SessionEntity(
        id=model.id,
        patient_id=model.patient_id,
        therapist_id=model.therapist_id,
        therapy_type=model.therapy_type,
        title=model.title,
        starts_at=model.starts_at,
        ends_at=model.ends_at,
        status=model.status,
        type=model.type,
        cancellation_reason=model.cancellation_reason,
        no_show_reason=model.no_show_reason,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


class DjangoSessionRepository(SessionRepository):
    def list_all(self) -> list[SessionEntity]:
        queryset = Session.objects.all().order_by("starts_at")
        return [_to_entity(item) for item in queryset]

    def get_by_id(self, session_id: UUID) -> SessionEntity | None:
        model = Session.objects.filter(id=session_id).first()
        return _to_entity(model) if model else None

    def patient_exists(self, patient_id: UUID) -> bool:
        return Patient.objects.filter(id=patient_id).exists()

    def therapist_exists(self, therapist_id: UUID) -> bool:
        return Therapist.objects.filter(id=therapist_id).exists()

    def therapist_specialty(self, therapist_id: UUID) -> str | None:
        return Therapist.objects.filter(id=therapist_id).values_list("specialty", flat=True).first()

    def has_therapist_conflict(
        self, *, therapist_id: UUID, starts_at: datetime, ends_at: datetime, exclude_session_id: UUID | None = None
    ) -> bool:
        queryset = Session.objects.select_for_update().filter(
            therapist_id=therapist_id,
            starts_at__lt=ends_at,
            ends_at__gt=starts_at,
        ).exclude(status="cancelled")
        if exclude_session_id:
            queryset = queryset.exclude(id=exclude_session_id)
        return queryset.exists()

    def add(
        self,
        *,
        patient_id: UUID,
        therapist_id: UUID,
        therapy_type: str,
        title: str,
        starts_at: datetime,
        ends_at: datetime,
        status: str,
        type: str,
        cancellation_reason: str | None = None,
        no_show_reason: str | None = None,
    ) -> SessionEntity:
        Therapist.objects.select_for_update().filter(id=therapist_id).first()
        model = Session.objects.create(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=therapy_type,
            title=title,
            starts_at=starts_at,
            ends_at=ends_at,
            status=status,
            type=type,
            cancellation_reason=cancellation_reason,
            no_show_reason=no_show_reason,
        )
        return _to_entity(model)

    def reschedule(self, *, session_id: UUID, starts_at: datetime, ends_at: datetime) -> SessionEntity:
        model = Session.objects.select_for_update().get(id=session_id)
        Therapist.objects.select_for_update().filter(id=model.therapist_id).first()
        model.starts_at = starts_at
        model.ends_at = ends_at
        model.save(update_fields=["starts_at", "ends_at", "updated_at"])
        return _to_entity(model)

    def update_status(
        self,
        *,
        session_id: UUID,
        status: str,
        cancellation_reason: str | None = None,
        no_show_reason: str | None = None,
    ) -> SessionEntity:
        model = Session.objects.select_for_update().get(id=session_id)
        model.status = status
        model.cancellation_reason = cancellation_reason
        model.no_show_reason = no_show_reason
        model.save(update_fields=["status", "cancellation_reason", "no_show_reason", "updated_at"])
        return _to_entity(model)

    def delete(self, session_id: UUID) -> None:
        Session.objects.filter(id=session_id).delete()

    def log_conflict(
        self,
        *,
        patient_id: UUID,
        therapist_id: UUID,
        therapy_type: str,
        session_type: str,
        starts_at: datetime,
        ends_at: datetime,
        action: str,
        reason: str,
    ) -> None:
        SessionConflictLog.objects.create(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=therapy_type,
            session_type=session_type,
            starts_at=starts_at,
            ends_at=ends_at,
            action=action,
            reason=reason,
        )
