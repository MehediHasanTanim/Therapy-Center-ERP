from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.payment_management.application.dtos import CreatePaymentCommand
from apps.payment_management.application.use_cases import PaymentManagementUseCases
from apps.payment_management.domain.entities import PaymentEntity
from apps.payment_management.domain.exceptions import NotFoundError, ValidationError
from apps.payment_management.infrastructure.uow import DjangoUnitOfWork
from apps.session_management.infrastructure.models import Session
from apps.reports_management.infrastructure.models import AuditLog

from .permissions import IsTherapyStaffOrAbove
from .serializers import PaymentCreateSerializer, PaymentReadSerializer


class PaymentViewSet(viewsets.ViewSet):
    permission_classes = [IsTherapyStaffOrAbove]

    def _use_cases(self) -> PaymentManagementUseCases:
        return PaymentManagementUseCases(DjangoUnitOfWork())

    @staticmethod
    def _to_payload(entity: PaymentEntity) -> dict:
        return {
            "id": entity.id,
            "patientId": entity.patient_id,
            "sessionId": entity.session_id,
            "amount": entity.amount,
            "method": entity.method,
            "createdAt": entity.created_at,
        }

    def list(self, request):
        entities = self._use_cases().list_payments()
        serializer = PaymentReadSerializer([self._to_payload(entity) for entity in entities], many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            entity = self._use_cases().create_payment(
                CreatePaymentCommand(
                    patient_id=data["patientId"],
                    session_id=data.get("sessionId"),
                    amount=data["amount"],
                    method=data["method"],
                )
            )
            output = PaymentReadSerializer(self._to_payload(entity))
            therapist_id = Session.objects.filter(id=entity.session_id).values_list("therapist_id", flat=True).first()
            AuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                entity_type="payment",
                entity_id=entity.id,
                action="created",
                patient_id=entity.patient_id,
                therapist_id=therapist_id,
                amount=entity.amount,
                therapist_name=Session.objects.filter(id=entity.session_id).values_list("therapist__full_name", flat=True).first()
                or "",
                payment_method=entity.method,
                metadata={
                    "patientId": str(entity.patient_id),
                    "sessionId": str(entity.session_id) if entity.session_id else None,
                    "amount": float(entity.amount),
                    "method": entity.method,
                },
            )
            return Response(output.data, status=status.HTTP_201_CREATED)
        except NotFoundError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
