from uuid import UUID

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.employee_management.application.dtos import CreateEmployeeCommand, UpdateEmployeeCommand, UploadEmployeeDocumentCommand
from apps.employee_management.application.use_cases import EmployeeManagementUseCases
from apps.employee_management.domain.entities import EmployeeCompensationEntity, EmployeeDocumentEntity, EmployeeEntity
from apps.employee_management.domain.exceptions import NotFoundError, ValidationError
from apps.employee_management.infrastructure.uow import DjangoUnitOfWork
from apps.user_management.presentation.permissions import IsSuperAdminOrAdmin

from .serializers import (
    EmployeeCreateSerializer,
    EmployeeDocumentReadSerializer,
    EmployeeDocumentUploadSerializer,
    EmployeeReadSerializer,
    EmployeeUpdateSerializer,
)


class EmployeeViewSet(viewsets.ViewSet):
    permission_classes = [IsSuperAdminOrAdmin]

    def _use_cases(self) -> EmployeeManagementUseCases:
        return EmployeeManagementUseCases(DjangoUnitOfWork())

    @staticmethod
    def _to_document_payload(entity: EmployeeDocumentEntity) -> dict:
        return {
            "id": entity.id,
            "employeeId": entity.employee_id,
            "fileName": entity.file_name,
            "contentType": entity.content_type,
            "size": entity.size,
            "docType": entity.doc_type,
            "version": entity.version,
            "uploadedAt": entity.uploaded_at,
            "fileUrl": entity.file_url,
        }

    @staticmethod
    def _to_compensation_payload(entity: EmployeeCompensationEntity | None) -> dict | None:
        if not entity:
            return None
        return {
            "payType": entity.pay_type,
            "baseRate": entity.base_rate,
            "currency": entity.currency,
            "effectiveFrom": entity.effective_from,
            "effectiveTo": entity.effective_to,
        }

    @classmethod
    def _to_employee_payload(cls, entity: EmployeeEntity) -> dict:
        return {
            "id": entity.id,
            "userId": entity.user_id,
            "email": entity.email,
            "role": entity.role,
            "fullName": entity.full_name,
            "phone": entity.phone,
            "address": entity.address,
            "dateOfBirth": entity.date_of_birth,
            "nationalId": entity.national_id,
            "emergencyContactName": entity.emergency_contact_name,
            "emergencyContactPhone": entity.emergency_contact_phone,
            "status": entity.status,
            "jobTitle": entity.job_title,
            "department": entity.department,
            "employmentType": entity.employment_type,
            "joinDate": entity.join_date,
            "endDate": entity.end_date,
            "managerId": entity.manager_id,
            "notes": entity.notes,
            "createdAt": entity.created_at,
            "compensation": cls._to_compensation_payload(entity.compensation),
            "documents": [cls._to_document_payload(doc) for doc in entity.documents],
        }

    def list(self, request):
        entities = self._use_cases().list_employees()
        serializer = EmployeeReadSerializer([self._to_employee_payload(entity) for entity in entities], many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            entity = self._use_cases().get_employee(UUID(str(pk)))
            serializer = EmployeeReadSerializer(self._to_employee_payload(entity))
            return Response(serializer.data)
        except (ValueError, NotFoundError):
            return Response({"detail": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = EmployeeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().create_employee(
                CreateEmployeeCommand(
                    user_id=data["userId"],
                    full_name=data["fullName"],
                    phone=data["phone"],
                    address=data.get("address"),
                    date_of_birth=data.get("dateOfBirth"),
                    national_id=data.get("nationalId"),
                    emergency_contact_name=data.get("emergencyContactName"),
                    emergency_contact_phone=data.get("emergencyContactPhone"),
                    status=data["status"],
                    job_title=data["jobTitle"],
                    department=data["department"],
                    employment_type=data["employmentType"],
                    join_date=data["joinDate"],
                    end_date=data.get("endDate"),
                    manager_id=data.get("managerId"),
                    notes=data.get("notes"),
                    compensation=data.get("compensation"),
                    role=data.get("role"),
                )
            )
            output = EmployeeReadSerializer(self._to_employee_payload(entity))
            return Response(output.data, status=status.HTTP_201_CREATED)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        serializer = EmployeeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().update_employee(
                UpdateEmployeeCommand(
                    employee_id=UUID(str(pk)),
                    full_name=data["fullName"],
                    phone=data["phone"],
                    address=data.get("address"),
                    date_of_birth=data.get("dateOfBirth"),
                    national_id=data.get("nationalId"),
                    emergency_contact_name=data.get("emergencyContactName"),
                    emergency_contact_phone=data.get("emergencyContactPhone"),
                    status=data["status"],
                    job_title=data["jobTitle"],
                    department=data["department"],
                    employment_type=data["employmentType"],
                    join_date=data["joinDate"],
                    end_date=data.get("endDate"),
                    manager_id=data.get("managerId"),
                    notes=data.get("notes"),
                    compensation=data.get("compensation"),
                    role=data.get("role"),
                )
            )
            output = EmployeeReadSerializer(self._to_employee_payload(entity))
            return Response(output.data)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"detail": "Invalid employee id"}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            entity = self._use_cases().deactivate_employee(UUID(str(pk)), None)
            output = EmployeeReadSerializer(self._to_employee_payload(entity))
            return Response(output.data)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"detail": "Invalid employee id"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="documents", parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, pk=None):
        serializer = EmployeeDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        uploaded_file = data["file"]

        try:
            doc = self._use_cases().upload_document(
                UploadEmployeeDocumentCommand(
                    employee_id=UUID(str(pk)),
                    file_name=uploaded_file.name,
                    content_type=uploaded_file.content_type or "application/octet-stream",
                    size=uploaded_file.size,
                    doc_type=data["docType"],
                    uploaded_file=uploaded_file,
                    uploaded_by_id=request.user.id if request.user.is_authenticated else None,
                )
            )
            output = EmployeeDocumentReadSerializer(self._to_document_payload(doc))
            return Response(output.data, status=status.HTTP_201_CREATED)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"detail": "Invalid employee id"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"], url_path=r"documents/(?P<doc_id>[^/.]+)")
    def delete_document(self, request, pk=None, doc_id=None):
        try:
            self._use_cases().delete_document(employee_id=UUID(str(pk)), document_id=UUID(str(doc_id)))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"detail": "Invalid id format"}, status=status.HTTP_400_BAD_REQUEST)
