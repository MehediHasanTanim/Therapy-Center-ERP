from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from apps.session_management.application.dtos import CreateSessionCommand, RescheduleSessionCommand
from apps.session_management.application.unit_of_work import AbstractUnitOfWork
from apps.session_management.application.use_cases import SessionManagementUseCases
from apps.session_management.domain.entities import SessionEntity
from apps.session_management.domain.exceptions import ConflictError, ValidationError
from apps.session_management.domain.repositories import SessionRepository
from apps.session_management.domain.value_objects import SessionKind, SessionStatus, TherapyType


class InMemorySessionRepository(SessionRepository):
    def __init__(self):
        self.items: dict = {}
        self.patients: set = set()
        self.therapists: dict = {}

    def list_all(self):
        return list(self.items.values())

    def get_by_id(self, session_id):
        return self.items.get(session_id)

    def patient_exists(self, patient_id):
        return patient_id in self.patients

    def therapist_exists(self, therapist_id):
        return therapist_id in self.therapists

    def therapist_specialty(self, therapist_id):
        return self.therapists.get(therapist_id)

    def has_therapist_conflict(self, *, therapist_id, starts_at, ends_at, exclude_session_id=None):
        for item in self.items.values():
            if item.status == SessionStatus.CANCELLED.value:
                continue
            if item.therapist_id != therapist_id:
                continue
            if exclude_session_id and item.id == exclude_session_id:
                continue
            if starts_at < item.ends_at and item.starts_at < ends_at:
                return True
        return False

    def add(self, *, patient_id, therapist_id, therapy_type, title, starts_at, ends_at, status, type):
        entity = SessionEntity(
            id=uuid4(),
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=therapy_type,
            title=title,
            starts_at=starts_at,
            ends_at=ends_at,
            status=status,
            type=type,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        self.items[entity.id] = entity
        return entity

    def reschedule(self, *, session_id, starts_at, ends_at):
        old = self.items[session_id]
        updated = replace(old, starts_at=starts_at, ends_at=ends_at, updated_at=datetime.now(UTC))
        self.items[session_id] = updated
        return updated

    def delete(self, session_id):
        self.items.pop(session_id, None)


class InMemoryUoW(AbstractUnitOfWork):
    def __init__(self):
        self.sessions = InMemorySessionRepository()
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
    therapist_id = uuid4()
    uow.sessions.patients.add(patient_id)
    uow.sessions.therapists[therapist_id] = "Speech Therapist"
    return SessionManagementUseCases(uow), patient_id, therapist_id


def test_create_session_success(setup_use_cases):
    use_cases, patient_id, therapist_id = setup_use_cases
    starts_at = datetime.now(UTC)
    ends_at = starts_at + timedelta(hours=1)
    created = use_cases.create_session(
        CreateSessionCommand(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=TherapyType.SPEECH.value,
            title="Speech Therapy",
            starts_at=starts_at,
            ends_at=ends_at,
            type=SessionKind.THERAPY.value,
        )
    )
    assert created.status == SessionStatus.SCHEDULED.value


def test_create_session_mismatched_specialty(setup_use_cases):
    use_cases, patient_id, therapist_id = setup_use_cases
    starts_at = datetime.now(UTC)
    ends_at = starts_at + timedelta(hours=1)
    with pytest.raises(ValidationError):
        use_cases.create_session(
            CreateSessionCommand(
                patient_id=patient_id,
                therapist_id=therapist_id,
                therapy_type=TherapyType.OCCUPATIONAL.value,
                title="OT Session",
                starts_at=starts_at,
                ends_at=ends_at,
                type=SessionKind.THERAPY.value,
            )
        )


def test_create_session_other_allows_any_specialty(setup_use_cases):
    use_cases, patient_id, therapist_id = setup_use_cases
    starts_at = datetime.now(UTC)
    ends_at = starts_at + timedelta(hours=1)
    created = use_cases.create_session(
        CreateSessionCommand(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=TherapyType.OTHER.value,
            title="General Session",
            starts_at=starts_at,
            ends_at=ends_at,
            type=SessionKind.THERAPY.value,
        )
    )
    assert created.therapy_type == TherapyType.OTHER.value


def test_create_session_double_booking_conflict(setup_use_cases):
    use_cases, patient_id, therapist_id = setup_use_cases
    base_start = datetime.now(UTC)
    use_cases.create_session(
        CreateSessionCommand(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=TherapyType.SPEECH.value,
            title="Session 1",
            starts_at=base_start,
            ends_at=base_start + timedelta(hours=1),
            type=SessionKind.THERAPY.value,
        )
    )

    with pytest.raises(ConflictError):
        use_cases.create_session(
            CreateSessionCommand(
                patient_id=patient_id,
                therapist_id=therapist_id,
                therapy_type=TherapyType.SPEECH.value,
                title="Session 2",
                starts_at=base_start + timedelta(minutes=30),
                ends_at=base_start + timedelta(hours=1, minutes=30),
                type=SessionKind.THERAPY.value,
            )
        )


def test_reschedule_conflict(setup_use_cases):
    use_cases, patient_id, therapist_id = setup_use_cases
    now = datetime.now(UTC)

    s1 = use_cases.create_session(
        CreateSessionCommand(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=TherapyType.SPEECH.value,
            title="Session 1",
            starts_at=now,
            ends_at=now + timedelta(hours=1),
            type=SessionKind.THERAPY.value,
        )
    )
    use_cases.create_session(
        CreateSessionCommand(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=TherapyType.SPEECH.value,
            title="Session 2",
            starts_at=now + timedelta(hours=2),
            ends_at=now + timedelta(hours=3),
            type=SessionKind.THERAPY.value,
        )
    )

    with pytest.raises(ConflictError):
        use_cases.reschedule_session(
            RescheduleSessionCommand(
                session_id=s1.id,
                starts_at=now + timedelta(hours=2, minutes=15),
                ends_at=now + timedelta(hours=2, minutes=45),
            )
        )


def test_delete_session_success(setup_use_cases):
    use_cases, patient_id, therapist_id = setup_use_cases
    starts_at = datetime.now(UTC)
    created = use_cases.create_session(
        CreateSessionCommand(
            patient_id=patient_id,
            therapist_id=therapist_id,
            therapy_type=TherapyType.SPEECH.value,
            title="Session To Delete",
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=1),
            type=SessionKind.THERAPY.value,
        )
    )
    use_cases.delete_session(created.id)
    assert use_cases.uow.sessions.get_by_id(created.id) is None
