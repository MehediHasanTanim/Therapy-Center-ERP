from dataclasses import replace
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from apps.therapist_management.application.dtos import AvailabilitySlotInput, CreateTherapistCommand
from apps.therapist_management.application.unit_of_work import AbstractUnitOfWork
from apps.therapist_management.application.use_cases import TherapistManagementUseCases
from apps.therapist_management.domain.entities import AvailabilitySlotEntity, TherapistEntity
from apps.therapist_management.domain.exceptions import NotFoundError, ValidationError
from apps.therapist_management.domain.repositories import TherapistRepository
from apps.therapist_management.domain.value_objects import TherapistSpecialty


class InMemoryTherapistRepository(TherapistRepository):
    def __init__(self):
        self.items: dict = {}

    def list_all(self):
        return list(self.items.values())

    def get_by_id(self, therapist_id):
        return self.items.get(therapist_id)

    def add(self, *, full_name, specialty, availability):
        entity = TherapistEntity(
            id=uuid4(),
            full_name=full_name,
            specialty=specialty,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            availability=list(availability),
        )
        self.items[entity.id] = entity
        return entity

    def update(self, *, therapist_id, full_name, specialty, availability):
        old = self.items[therapist_id]
        updated = replace(
            old,
            full_name=full_name,
            specialty=specialty,
            availability=list(availability),
            updated_at=datetime.now(UTC),
        )
        self.items[therapist_id] = updated
        return updated

    def delete(self, therapist_id):
        self.items.pop(therapist_id, None)


class InMemoryUoW(AbstractUnitOfWork):
    def __init__(self):
        self.therapists = InMemoryTherapistRepository()
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
    return TherapistManagementUseCases(InMemoryUoW())


def test_create_therapist_success(use_cases):
    therapist = use_cases.create_therapist(
        CreateTherapistCommand(
            full_name="Nabila Rahman",
            specialty=TherapistSpecialty.SPEECH_THERAPIST.value,
            availability=[AvailabilitySlotInput(day_of_week=1, start_hour="09:00", end_hour="17:00")],
        )
    )
    assert therapist.full_name == "Nabila Rahman"
    assert therapist.specialty == TherapistSpecialty.SPEECH_THERAPIST.value
    assert therapist.availability[0].day_of_week == 1


def test_create_therapist_invalid_specialty(use_cases):
    with pytest.raises(ValidationError):
        use_cases.create_therapist(
            CreateTherapistCommand(
                full_name="Nabila Rahman",
                specialty="Music Therapist",
                availability=[AvailabilitySlotInput(day_of_week=1, start_hour="09:00", end_hour="17:00")],
            )
        )


def test_create_therapist_duplicate_days(use_cases):
    with pytest.raises(ValidationError):
        use_cases.create_therapist(
            CreateTherapistCommand(
                full_name="Nabila Rahman",
                specialty=TherapistSpecialty.OTHER.value,
                availability=[
                    AvailabilitySlotInput(day_of_week=1, start_hour="09:00", end_hour="17:00"),
                    AvailabilitySlotInput(day_of_week=1, start_hour="10:00", end_hour="16:00"),
                ],
            )
        )


def test_delete_therapist_not_found(use_cases):
    with pytest.raises(NotFoundError):
        use_cases.delete_therapist(uuid4())
