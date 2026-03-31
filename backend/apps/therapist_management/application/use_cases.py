from datetime import time
from uuid import UUID

from apps.therapist_management.application.dtos import AvailabilitySlotInput, CreateTherapistCommand, UpdateTherapistCommand
from apps.therapist_management.application.unit_of_work import AbstractUnitOfWork
from apps.therapist_management.domain.entities import AvailabilitySlotEntity, TherapistEntity
from apps.therapist_management.domain.exceptions import NotFoundError, ValidationError
from apps.therapist_management.domain.value_objects import TherapistSpecialty


class TherapistManagementUseCases:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    def list_therapists(self) -> list[TherapistEntity]:
        with self.uow:
            return self.uow.therapists.list_all()

    def get_therapist(self, therapist_id: UUID) -> TherapistEntity:
        with self.uow:
            therapist = self.uow.therapists.get_by_id(therapist_id)
            if therapist is None:
                raise NotFoundError("Therapist not found")
            return therapist

    def create_therapist(self, command: CreateTherapistCommand) -> TherapistEntity:
        slots = self._validate_and_build_slots(command.specialty, command.availability)
        payout_percentage = self._normalize_payout_percentage(command.payout_percentage)
        with self.uow:
            therapist = self.uow.therapists.add(
                full_name=command.full_name,
                specialty=command.specialty,
                availability=slots,
                payout_percentage=payout_percentage,
            )
            self.uow.commit()
            return therapist

    def update_therapist(self, command: UpdateTherapistCommand) -> TherapistEntity:
        slots = self._validate_and_build_slots(command.specialty, command.availability)
        payout_percentage = self._normalize_payout_percentage(command.payout_percentage)
        with self.uow:
            existing = self.uow.therapists.get_by_id(command.therapist_id)
            if existing is None:
                raise NotFoundError("Therapist not found")
            therapist = self.uow.therapists.update(
                therapist_id=command.therapist_id,
                full_name=command.full_name,
                specialty=command.specialty,
                availability=slots,
                payout_percentage=payout_percentage,
            )
            self.uow.commit()
            return therapist

    def delete_therapist(self, therapist_id: UUID) -> None:
        with self.uow:
            existing = self.uow.therapists.get_by_id(therapist_id)
            if existing is None:
                raise NotFoundError("Therapist not found")
            self.uow.therapists.delete(therapist_id)
            self.uow.commit()

    @staticmethod
    def _validate_and_build_slots(specialty: str, availability: list[AvailabilitySlotInput]) -> list[AvailabilitySlotEntity]:
        if specialty not in TherapistSpecialty.values():
            raise ValidationError("Invalid therapist specialty")
        if len(availability) == 0:
            raise ValidationError("At least one availability slot is required")

        slots: list[AvailabilitySlotEntity] = []
        seen_days: set[int] = set()
        for slot in availability:
            if slot.day_of_week < 0 or slot.day_of_week > 6:
                raise ValidationError("dayOfWeek must be between 0 and 6")
            if slot.day_of_week in seen_days:
                raise ValidationError("Duplicate dayOfWeek is not allowed")
            seen_days.add(slot.day_of_week)

            start = TherapistManagementUseCases._parse_time(slot.start_hour)
            end = TherapistManagementUseCases._parse_time(slot.end_hour)
            if start >= end:
                raise ValidationError("startHour must be earlier than endHour")

            slots.append(
                AvailabilitySlotEntity(
                    day_of_week=slot.day_of_week,
                    start_hour=start.strftime("%H:%M"),
                    end_hour=end.strftime("%H:%M"),
                )
            )
        return slots

    @staticmethod
    def _parse_time(value: str) -> time:
        try:
            parsed = time.fromisoformat(value)
            return parsed.replace(second=0, microsecond=0)
        except ValueError as exc:
            raise ValidationError("Invalid time format; expected HH:MM") from exc

    @staticmethod
    def _normalize_payout_percentage(value: float | None) -> float:
        if value is None:
            return 70.0
        if value < 0 or value > 100:
            raise ValidationError("payoutPercentage must be between 0 and 100")
        return float(round(value, 2))
