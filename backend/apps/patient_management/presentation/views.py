from uuid import UUID

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.patient_management.application.dtos import CreatePatientCommand, UpdatePatientCommand, UploadPatientDocumentCommand
from apps.patient_management.application.use_cases import PatientManagementUseCases
from apps.patient_management.domain.entities import PatientDocumentEntity, PatientEntity
from apps.patient_management.domain.exceptions import NotFoundError, ValidationError
from apps.patient_management.infrastructure.uow import DjangoUnitOfWork

from .permissions import IsTherapyStaffOrAbove
from .serializers import PatientCreateSerializer, PatientDocumentReadSerializer, PatientDocumentUploadSerializer, PatientReadSerializer, PatientUpdateSerializer


class PatientViewSet(viewsets.ViewSet):
    permission_classes = [IsTherapyStaffOrAbove]

    def _use_cases(self) -> PatientManagementUseCases:
        return PatientManagementUseCases(DjangoUnitOfWork())

    @staticmethod
    def _to_document_payload(entity: PatientDocumentEntity) -> dict:
        return {
            "id": entity.id,
            "patientId": entity.patient_id,
            "fileName": entity.file_name,
            "contentType": entity.content_type,
            "size": entity.size,
            "version": entity.version,
            "uploadedAt": entity.uploaded_at,
            "fileUrl": entity.file_url,
        }

    @classmethod
    def _to_patient_payload(cls, entity: PatientEntity) -> dict:
        return {
            "id": entity.id,
            "fullName": entity.full_name,
            "parentName": entity.parent_name,
            "spectrum": entity.spectrum,
            "dateOfBirth": entity.date_of_birth,
            "phone": entity.phone,
            "address": entity.address,
            "notes": entity.notes,
            "createdAt": entity.created_at,
            "documents": [cls._to_document_payload(doc) for doc in entity.documents],
        }

    def list(self, request):
        entities = self._use_cases().list_patients()
        serializer = PatientReadSerializer([self._to_patient_payload(entity) for entity in entities], many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            entity = self._use_cases().get_patient(UUID(str(pk)))
            serializer = PatientReadSerializer(self._to_patient_payload(entity))
            return Response(serializer.data)
        except (ValueError, NotFoundError):
            return Response({"detail": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = PatientCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().create_patient(
                CreatePatientCommand(
                    full_name=data["fullName"],
                    parent_name=data["parentName"],
                    spectrum=data["spectrum"],
                    date_of_birth=data["dateOfBirth"],
                    phone=data["phone"],
                    address=data["address"],
                    notes=data.get("notes") or None,
                )
            )
            output = PatientReadSerializer(self._to_patient_payload(entity))
            return Response(output.data, status=status.HTTP_201_CREATED)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        serializer = PatientUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().update_patient(
                UpdatePatientCommand(
                    patient_id=UUID(str(pk)),
                    full_name=data["fullName"],
                    parent_name=data["parentName"],
                    spectrum=data["spectrum"],
                    date_of_birth=data["dateOfBirth"],
                    phone=data["phone"],
                    address=data["address"],
                    notes=data.get("notes") or None,
                )
            )
            output = PatientReadSerializer(self._to_patient_payload(entity))
            return Response(output.data)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"detail": "Invalid patient id"}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            self._use_cases().delete_patient(UUID(str(pk)))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"detail": "Invalid patient id"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="documents", parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, pk=None):
        serializer = PatientDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        uploaded_file = data["file"]

        try:
            doc = self._use_cases().upload_document(
                UploadPatientDocumentCommand(
                    patient_id=UUID(str(pk)),
                    file_name=uploaded_file.name,
                    content_type=uploaded_file.content_type or "application/octet-stream",
                    size=uploaded_file.size,
                    uploaded_file=uploaded_file,
                )
            )
            output = PatientDocumentReadSerializer(self._to_document_payload(doc))
            return Response(output.data, status=status.HTTP_201_CREATED)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"detail": "Invalid patient id"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path=r"documents/(?P<doc_id>[^/.]+)")
    def delete_document(self, request, pk=None, doc_id=None):
        try:
            self._use_cases().delete_document(patient_id=UUID(str(pk)), document_id=UUID(str(doc_id)))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"detail": "Invalid id format"}, status=status.HTTP_400_BAD_REQUEST)
