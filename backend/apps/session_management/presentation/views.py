from uuid import UUID

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.reports_management.infrastructure.models import AuditLog
from apps.therapist_management.infrastructure.models import Therapist
from apps.session_management.application.dtos import CreateSessionCommand, RescheduleSessionCommand
from apps.session_management.application.use_cases import SessionManagementUseCases
from apps.session_management.domain.entities import SessionEntity
from apps.session_management.domain.exceptions import ConflictError, NotFoundError, ValidationError
from apps.session_management.infrastructure.uow import DjangoUnitOfWork

from .permissions import IsTherapyStaffOrAbove
from .serializers import SessionCreateSerializer, SessionReadSerializer, SessionRescheduleSerializer, SessionStatusUpdateSerializer


class SessionViewSet(viewsets.ViewSet):
    permission_classes = [IsTherapyStaffOrAbove]

    def _use_cases(self) -> SessionManagementUseCases:
        return SessionManagementUseCases(DjangoUnitOfWork())

    @staticmethod
    def _to_payload(entity: SessionEntity) -> dict:
        return {
            "id": entity.id,
            "patientId": entity.patient_id,
            "therapistId": entity.therapist_id,
            "therapyType": entity.therapy_type,
            "title": entity.title,
            "startsAt": entity.starts_at,
            "endsAt": entity.ends_at,
            "status": entity.status,
            "type": entity.type,
            "cancellationReason": entity.cancellation_reason,
            "noShowReason": entity.no_show_reason,
            "createdAt": entity.created_at,
        }

    def list(self, request):
        entities = self._use_cases().list_sessions()
        serializer = SessionReadSerializer([self._to_payload(entity) for entity in entities], many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = SessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        recurrence = data.get("recurrence")

        try:
            entities = self._use_cases().create_session(
                CreateSessionCommand(
                    patient_id=data["patientId"],
                    therapist_id=data["therapistId"],
                    therapy_type=data["therapyType"],
                    title=data["title"],
                    starts_at=data["startsAt"],
                    ends_at=data["endsAt"],
                    type=data["type"],
                    cancellation_reason=data.get("cancellationReason"),
                    no_show_reason=data.get("noShowReason"),
                    recurrence=recurrence,
                )
            )
            for entity in entities:
                therapist_name = (
                    Therapist.objects.filter(id=entity.therapist_id).values_list("full_name", flat=True).first() or ""
                )
                AuditLog.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    entity_type="session",
                    entity_id=entity.id,
                    action="created",
                    patient_id=entity.patient_id,
                    therapist_id=entity.therapist_id,
                    therapist_name=therapist_name,
                    session_title=entity.title,
                    metadata={
                        "therapyType": entity.therapy_type,
                        "status": entity.status,
                        "type": entity.type,
                        "startsAt": entity.starts_at.isoformat(),
                        "endsAt": entity.ends_at.isoformat(),
                    },
                )
            first = entities[0]
            output = SessionReadSerializer(self._to_payload(first))
            return Response(
                {"session": output.data, "createdCount": len(entities)},
                status=status.HTTP_201_CREATED,
            )
        except NotFoundError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ConflictError as exc:
            return Response({"message": str(exc), "code": "DOUBLE_BOOKING"}, status=status.HTTP_409_CONFLICT)

    def destroy(self, request, pk=None):
        try:
            self._use_cases().delete_session(UUID(str(pk)))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except NotFoundError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"message": "Invalid session id"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["patch"], url_path="reschedule")
    def reschedule(self, request, pk=None):
        serializer = SessionRescheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            entity = self._use_cases().reschedule_session(
                RescheduleSessionCommand(
                    session_id=UUID(str(pk)),
                    starts_at=data["startsAt"],
                    ends_at=data["endsAt"],
                )
            )
            output = SessionReadSerializer(self._to_payload(entity))
            therapist_name = Therapist.objects.filter(id=entity.therapist_id).values_list("full_name", flat=True).first() or ""
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                entity_type="session",
                entity_id=entity.id,
                action="rescheduled",
                patient_id=entity.patient_id,
                therapist_id=entity.therapist_id,
                therapist_name=therapist_name,
                session_title=entity.title,
                metadata={
                    "startsAt": entity.starts_at.isoformat(),
                    "endsAt": entity.ends_at.isoformat(),
                },
            )
            return Response(output.data)
        except NotFoundError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ConflictError as exc:
            return Response({"message": str(exc), "code": "DOUBLE_BOOKING"}, status=status.HTTP_409_CONFLICT)
        except ValueError:
            return Response({"message": "Invalid session id"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        serializer = SessionStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            entity = self._use_cases().update_session_status(
                session_id=UUID(str(pk)),
                status=data["status"],
                cancellation_reason=data.get("cancellationReason"),
                no_show_reason=data.get("noShowReason"),
            )
            output = SessionReadSerializer(self._to_payload(entity))
            therapist_name = Therapist.objects.filter(id=entity.therapist_id).values_list("full_name", flat=True).first() or ""
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                entity_type="session",
                entity_id=entity.id,
                action="status_updated",
                patient_id=entity.patient_id,
                therapist_id=entity.therapist_id,
                therapist_name=therapist_name,
                session_title=entity.title,
                metadata={
                    "status": entity.status,
                    "cancellationReason": entity.cancellation_reason,
                    "noShowReason": entity.no_show_reason,
                },
            )
            return Response(output.data)
        except NotFoundError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"message": "Invalid session id"}, status=status.HTTP_400_BAD_REQUEST)
