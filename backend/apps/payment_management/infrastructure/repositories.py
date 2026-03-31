from uuid import UUID

from apps.patient_management.infrastructure.models import Patient
from apps.payment_management.domain.entities import PaymentEntity
from apps.payment_management.domain.repositories import PaymentRepository
from apps.session_management.infrastructure.models import Session

from .models import Payment


def _to_entity(model: Payment) -> PaymentEntity:
    return PaymentEntity(
        id=model.id,
        patient_id=model.patient_id,
        session_id=model.session_id,
        amount=float(model.amount),
        method=model.method,
        created_at=model.created_at,
    )


class DjangoPaymentRepository(PaymentRepository):
    def list_all(self) -> list[PaymentEntity]:
        return [_to_entity(item) for item in Payment.objects.all().order_by("-created_at")]

    def add(self, *, patient_id: UUID, session_id: UUID | None, amount: float, method: str) -> PaymentEntity:
        model = Payment.objects.create(
            patient_id=patient_id,
            session_id=session_id,
            amount=amount,
            method=method,
        )
        return _to_entity(model)

    def patient_exists(self, patient_id: UUID) -> bool:
        return Patient.objects.filter(id=patient_id).exists()

    def session_exists(self, session_id: UUID) -> bool:
        return Session.objects.filter(id=session_id).exists()

