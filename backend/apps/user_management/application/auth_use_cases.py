from apps.user_management.application.auth_dtos import LoginCommand, RefreshTokenCommand
from apps.user_management.application.unit_of_work import AbstractUnitOfWork
from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.exceptions import AuthenticationError
from apps.user_management.infrastructure.jwt_service import JWTService


class AuthUseCases:
    def __init__(self, uow: AbstractUnitOfWork, jwt_service: JWTService) -> None:
        self.uow = uow
        self.jwt_service = jwt_service

    def login(self, command: LoginCommand) -> tuple[UserEntity, str, str]:
        with self.uow:
            user = self.uow.users.verify_credentials(email=command.email, password=command.password)
            if user is None or not user.is_active:
                raise AuthenticationError("Invalid credentials")
            access = self.jwt_service.generate_access_token(user)
            refresh = self.jwt_service.generate_refresh_token(user)
            return user, access, refresh

    def refresh(self, command: RefreshTokenCommand) -> tuple[UserEntity, str, str]:
        payload = self.jwt_service.decode(command.refresh_token, expected_type="refresh")
        user_id = self.jwt_service.user_id_from_payload(payload)

        with self.uow:
            user = self.uow.users.get_by_id(user_id)
            if user is None or not user.is_active:
                raise AuthenticationError("Invalid refresh token")
            access = self.jwt_service.generate_access_token(user)
            refresh = self.jwt_service.generate_refresh_token(user)
            return user, access, refresh
