from uuid import UUID

from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.therapist_management.application.dtos import AvailabilitySlotInput, CreateTherapistCommand, UpdateTherapistCommand
from apps.therapist_management.application.use_cases import TherapistManagementUseCases
from apps.therapist_management.domain.entities import AvailabilitySlotEntity, TherapistEntity
from apps.therapist_management.domain.exceptions import NotFoundError, ValidationError
from apps.therapist_management.infrastructure.uow import DjangoUnitOfWork
from apps.session_management.domain.value_objects import THERAPY_SPECIALTY_MAP, TherapyType

from .permissions import IsTherapyStaffOrAbove
from .serializers import TherapistCreateSerializer, TherapistReadSerializer, TherapistUpdateSerializer


class TherapistViewSet(viewsets.ViewSet):
    permission_classes = [IsTherapyStaffOrAbove]

    def _use_cases(self) -> TherapistManagementUseCases:
        return TherapistManagementUseCases(DjangoUnitOfWork())

    @staticmethod
    def _to_availability_payload(slot: AvailabilitySlotEntity) -> dict:
        return {
            "dayOfWeek": slot.day_of_week,
            "startHour": slot.start_hour,
            "endHour": slot.end_hour,
        }

    @classmethod
    def _to_therapist_payload(cls, entity: TherapistEntity) -> dict:
        return {
            "id": entity.id,
            "fullName": entity.full_name,
            "specialty": entity.specialty,
            "payoutPercentage": entity.payout_percentage,
            "createdAt": entity.created_at,
            "availability": [cls._to_availability_payload(slot) for slot in entity.availability],
        }

    @staticmethod
    def _to_slot_inputs(payload: list[dict]) -> list[AvailabilitySlotInput]:
        return [
            AvailabilitySlotInput(
                day_of_week=slot["dayOfWeek"],
                start_hour=slot["startHour"].strftime("%H:%M"),
                end_hour=slot["endHour"].strftime("%H:%M"),
            )
            for slot in payload
        ]

    def list(self, request):
        entities = self._use_cases().list_therapists()

        therapy_type = request.query_params.get("therapyType")
        if therapy_type:
            if therapy_type not in TherapyType.values():
                return Response({"message": "Invalid therapyType"}, status=status.HTTP_400_BAD_REQUEST)
            if therapy_type != TherapyType.OTHER.value:
                expected_specialty = THERAPY_SPECIALTY_MAP[therapy_type]
                entities = [entity for entity in entities if entity.specialty == expected_specialty]

        search = request.query_params.get("search", "").strip().lower()
        specialty = request.query_params.get("specialty", "").strip()
        if specialty and specialty.lower() != "all":
            entities = [entity for entity in entities if entity.specialty == specialty]
        if search:
            entities = [entity for entity in entities if search in f"{entity.full_name} {entity.specialty}".lower()]

        has_table_query = any(key in request.query_params for key in ("page", "pageSize", "search", "specialty", "sortBy", "sortOrder"))
        sort_by = request.query_params.get("sortBy", "fullName")
        sort_order = request.query_params.get("sortOrder", "asc")
        if sort_order not in {"asc", "desc"}:
            return Response({"message": "Invalid sortOrder"}, status=status.HTTP_400_BAD_REQUEST)
        if sort_by not in {"fullName", "specialty", "createdAt"}:
            return Response({"message": "Invalid sortBy"}, status=status.HTTP_400_BAD_REQUEST)
        if has_table_query:
            reverse = sort_order == "desc"
            if sort_by == "specialty":
                entities = sorted(entities, key=lambda item: item.specialty.lower(), reverse=reverse)
            elif sort_by == "createdAt":
                entities = sorted(entities, key=lambda item: item.created_at, reverse=reverse)
            else:
                entities = sorted(entities, key=lambda item: item.full_name.lower(), reverse=reverse)

        if has_table_query:
            try:
                page = max(1, int(request.query_params.get("page", "1")))
                page_size = int(request.query_params.get("pageSize", "10"))
                page_size = max(1, min(page_size, 100))
            except ValueError:
                return Response({"message": "Invalid page or pageSize"}, status=status.HTTP_400_BAD_REQUEST)

            total = len(entities)
            total_pages = max(1, (total + page_size - 1) // page_size)
            safe_page = min(page, total_pages)
            start = (safe_page - 1) * page_size
            paged = entities[start : start + page_size]
            serializer = TherapistReadSerializer([self._to_therapist_payload(entity) for entity in paged], many=True)
            return Response(
                {
                    "items": serializer.data,
                    "total": total,
                    "page": safe_page,
                    "pageSize": page_size,
                    "totalPages": total_pages,
                }
            )

        serializer = TherapistReadSerializer([self._to_therapist_payload(entity) for entity in entities], many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            entity = self._use_cases().get_therapist(UUID(str(pk)))
            serializer = TherapistReadSerializer(self._to_therapist_payload(entity))
            return Response(serializer.data)
        except (ValueError, NotFoundError):
            return Response({"detail": "Therapist not found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = TherapistCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().create_therapist(
                CreateTherapistCommand(
                    full_name=data["fullName"],
                    specialty=data["specialty"],
                    payout_percentage=data.get("payoutPercentage"),
                    availability=self._to_slot_inputs(data["availability"]),
                )
            )
            output = TherapistReadSerializer(self._to_therapist_payload(entity))
            return Response(output.data, status=status.HTTP_201_CREATED)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        serializer = TherapistUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().update_therapist(
                UpdateTherapistCommand(
                    therapist_id=UUID(str(pk)),
                    full_name=data["fullName"],
                    specialty=data["specialty"],
                    payout_percentage=data.get("payoutPercentage"),
                    availability=self._to_slot_inputs(data["availability"]),
                )
            )
            output = TherapistReadSerializer(self._to_therapist_payload(entity))
            return Response(output.data)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"detail": "Invalid therapist id"}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            self._use_cases().delete_therapist(UUID(str(pk)))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"detail": "Invalid therapist id"}, status=status.HTTP_400_BAD_REQUEST)
