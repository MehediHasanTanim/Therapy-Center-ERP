from uuid import UUID

from rest_framework import status, viewsets
from rest_framework.response import Response

from apps.user_management.application.dtos import CreateUserCommand, DeleteUserCommand, UpdateUserCommand
from apps.user_management.application.use_cases import UserManagementUseCases
from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.exceptions import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from apps.user_management.infrastructure.uow import DjangoUnitOfWork

from .permissions import IsSuperAdminOrAdmin
from .serializers import UserCreateSerializer, UserReadSerializer, UserUpdateSerializer


class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsSuperAdminOrAdmin]

    def _use_cases(self) -> UserManagementUseCases:
        return UserManagementUseCases(DjangoUnitOfWork())

    @staticmethod
    def _to_response_payload(entity: UserEntity) -> dict:
        return {
            "id": entity.id,
            "name": entity.name,
            "email": entity.email,
            "role": entity.role.value,
            "is_active": entity.is_active,
            "created_at": entity.created_at,
            "updated_at": entity.updated_at,
        }

    def list(self, request):
        entities = self._use_cases().list_users()
        serializer = UserReadSerializer([self._to_response_payload(entity) for entity in entities], many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            entity = self._use_cases().get_user(UUID(str(pk)))
            serializer = UserReadSerializer(self._to_response_payload(entity))
            return Response(serializer.data)
        except (ValueError, NotFoundError):
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().create_user(
                CreateUserCommand(
                    actor_role=request.user.role,
                    name=data["name"],
                    email=data["email"],
                    role=data["role"],
                    password=data["password"],
                )
            )
            output = UserReadSerializer(self._to_response_payload(entity))
            return Response(output.data, status=status.HTTP_201_CREATED)
        except PermissionDeniedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

    def update(self, request, pk=None):
        serializer = UserUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            entity = self._use_cases().update_user(
                UpdateUserCommand(
                    actor_role=request.user.role,
                    user_id=UUID(str(pk)),
                    name=data["name"],
                    email=data["email"],
                    role=data["role"],
                    password=data.get("password"),
                )
            )
            output = UserReadSerializer(self._to_response_payload(entity))
            return Response(output.data)
        except PermissionDeniedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except ValueError:
            return Response({"detail": "Invalid user id"}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        try:
            self._use_cases().delete_user(
                DeleteUserCommand(
                    actor_role=request.user.role,
                    actor_id=request.user.id,
                    user_id=UUID(str(pk)),
                )
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PermissionDeniedError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except NotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({"detail": "Invalid user id"}, status=status.HTTP_400_BAD_REQUEST)
