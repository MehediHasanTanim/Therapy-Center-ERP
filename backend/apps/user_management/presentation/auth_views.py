from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.user_management.application.auth_dtos import LoginCommand, RefreshTokenCommand
from apps.user_management.application.auth_use_cases import AuthUseCases
from apps.user_management.domain.exceptions import AuthenticationError
from apps.user_management.infrastructure.jwt_service import JWTService
from apps.user_management.infrastructure.uow import DjangoUnitOfWork

from .auth_serializers import LoginSerializer, RefreshTokenSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        command = LoginCommand(**serializer.validated_data)
        use_cases = AuthUseCases(DjangoUnitOfWork(), JWTService())

        try:
            user, access_token, refresh_token = use_cases.login(command)
        except AuthenticationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": {
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": user.role.value,
                },
            },
            status=status.HTTP_200_OK,
        )


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        command = RefreshTokenCommand(**serializer.validated_data)
        use_cases = AuthUseCases(DjangoUnitOfWork(), JWTService())

        try:
            _user, access_token, refresh_token = use_cases.refresh(command)
        except AuthenticationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            },
            status=status.HTTP_200_OK,
        )
