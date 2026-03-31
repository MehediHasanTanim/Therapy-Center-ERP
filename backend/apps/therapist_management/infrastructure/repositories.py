from datetime import time
from uuid import UUID

from apps.therapist_management.domain.entities import AvailabilitySlotEntity, TherapistEntity
from apps.therapist_management.domain.repositories import TherapistRepository

from .models import Therapist, TherapistAvailability


def _time_to_str(value: time) -> str:
    return value.strftime("%H:%M")


def _to_availability_entity(model: TherapistAvailability) -> AvailabilitySlotEntity:
    return AvailabilitySlotEntity(
        day_of_week=model.day_of_week,
        start_hour=_time_to_str(model.start_hour),
        end_hour=_time_to_str(model.end_hour),
    )


def _to_entity(model: Therapist) -> TherapistEntity:
    slots = [_to_availability_entity(slot) for slot in model.availability.all()]
    return TherapistEntity(
        id=model.id,
        full_name=model.full_name,
        specialty=model.specialty,
        payout_percentage=float(model.payout_percentage),
        created_at=model.created_at,
        updated_at=model.updated_at,
        availability=slots,
    )


class DjangoTherapistRepository(TherapistRepository):
    def list_all(self) -> list[TherapistEntity]:
        queryset = Therapist.objects.prefetch_related("availability").order_by("-created_at")
        return [_to_entity(item) for item in queryset]

    def get_by_id(self, therapist_id: UUID) -> TherapistEntity | None:
        model = Therapist.objects.prefetch_related("availability").filter(id=therapist_id).first()
        return _to_entity(model) if model else None

    def add(
        self,
        *,
        full_name: str,
        specialty: str,
        availability: list[AvailabilitySlotEntity],
        payout_percentage: float,
    ) -> TherapistEntity:
        model = Therapist.objects.create(full_name=full_name, specialty=specialty, payout_percentage=payout_percentage)
        TherapistAvailability.objects.bulk_create(
            [
                TherapistAvailability(
                    therapist=model,
                    day_of_week=slot.day_of_week,
                    start_hour=slot.start_hour,
                    end_hour=slot.end_hour,
                )
                for slot in availability
            ]
        )
        model = Therapist.objects.prefetch_related("availability").get(id=model.id)
        return _to_entity(model)

    def update(
        self,
        *,
        therapist_id: UUID,
        full_name: str,
        specialty: str,
        availability: list[AvailabilitySlotEntity],
        payout_percentage: float,
    ) -> TherapistEntity:
        model = Therapist.objects.get(id=therapist_id)
        model.full_name = full_name
        model.specialty = specialty
        model.payout_percentage = payout_percentage
        model.save(update_fields=["full_name", "specialty", "payout_percentage", "updated_at"])

        TherapistAvailability.objects.filter(therapist_id=therapist_id).delete()
        TherapistAvailability.objects.bulk_create(
            [
                TherapistAvailability(
                    therapist=model,
                    day_of_week=slot.day_of_week,
                    start_hour=slot.start_hour,
                    end_hour=slot.end_hour,
                )
                for slot in availability
            ]
        )
        model = Therapist.objects.prefetch_related("availability").get(id=therapist_id)
        return _to_entity(model)

    def delete(self, therapist_id: UUID) -> None:
        Therapist.objects.filter(id=therapist_id).delete()
