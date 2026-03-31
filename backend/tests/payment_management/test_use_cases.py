from datetime import UTC, datetime
from uuid import uuid4

import pytest

from apps.payment_management.application.dtos import CreatePaymentCommand
from apps.payment_management.application.unit_of_work import AbstractUnitOfWork
from apps.payment_management.application.use_cases import PaymentManagementUseCases
from apps.payment_management.domain.entities import PaymentEntity
from apps.payment_management.domain.exceptions import NotFoundError, ValidationError
from apps.payment_management.domain.repositories import PaymentRepository
from apps.payment_management.domain.value_objects import PaymentMethod


class InMemoryPaymentRepository(PaymentRepository):
    def __init__(self):
        self.items: dict = {}
        self.patients: set = set()
        self.sessions: set = set()

    def list_all(self):
        return list(self.items.values())

    def add(self, *, patient_id, session_id, amount, method):
        entity = PaymentEntity(
            id=uuid4(),
            patient_id=patient_id,
            session_id=session_id,
            amount=amount,
            method=method,
            created_at=datetime.now(UTC),
        )
        self.items[entity.id] = entity
        return entity

    def patient_exists(self, patient_id):
        return patient_id in self.patients

    def session_exists(self, session_id):
        return session_id in self.sessions


class InMemoryUoW(AbstractUnitOfWork):
    def __init__(self):
        self.payments = InMemoryPaymentRepository()
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
def setup_use_cases():
    uow = InMemoryUoW()
    patient_id = uuid4()
    session_id = uuid4()
    uow.payments.patients.add(patient_id)
    uow.payments.sessions.add(session_id)
    return PaymentManagementUseCases(uow), patient_id, session_id


def test_create_payment_success(setup_use_cases):
    use_cases, patient_id, session_id = setup_use_cases
    created = use_cases.create_payment(
        CreatePaymentCommand(
            patient_id=patient_id,
            session_id=session_id,
            amount=2500,
            method=PaymentMethod.CARD.value,
        )
    )
    assert created.amount == 2500


def test_create_payment_missing_patient(setup_use_cases):
    use_cases, _, session_id = setup_use_cases
    with pytest.raises(NotFoundError):
        use_cases.create_payment(
            CreatePaymentCommand(
                patient_id=uuid4(),
                session_id=session_id,
                amount=1000,
                method=PaymentMethod.CASH.value,
            )
        )


def test_create_payment_invalid_method(setup_use_cases):
    use_cases, patient_id, session_id = setup_use_cases
    with pytest.raises(ValidationError):
        use_cases.create_payment(
            CreatePaymentCommand(
                patient_id=patient_id,
                session_id=session_id,
                amount=1000,
                method="bank_transfer",
            )
        )

