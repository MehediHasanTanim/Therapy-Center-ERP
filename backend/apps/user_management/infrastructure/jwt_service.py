from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from django.conf import settings

from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.exceptions import AuthenticationError


class JWTService:
    def generate_access_token(self, user: UserEntity) -> str:
        return self._encode(user=user, token_type="access", expires_delta=timedelta(minutes=settings.JWT_ACCESS_TTL_MINUTES))

    def generate_refresh_token(self, user: UserEntity) -> str:
        return self._encode(user=user, token_type="refresh", expires_delta=timedelta(days=settings.JWT_REFRESH_TTL_DAYS))

    def decode(self, token: str, *, expected_type: str) -> dict:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid token") from exc

        if payload.get("token_type") != expected_type:
            raise AuthenticationError("Invalid token type")

        return payload

    def _encode(self, *, user: UserEntity, token_type: str, expires_delta: timedelta) -> str:
        now = datetime.now(UTC)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "token_type": token_type,
            "iat": now,
            "exp": now + expires_delta,
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def user_id_from_payload(payload: dict) -> UUID:
        return UUID(str(payload["sub"]))
