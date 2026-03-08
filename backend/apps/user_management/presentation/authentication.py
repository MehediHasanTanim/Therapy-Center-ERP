from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.user_management.infrastructure.jwt_service import JWTService
from apps.user_management.infrastructure.models import User


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1]
        jwt_service = JWTService()

        try:
            payload = jwt_service.decode(token, expected_type="access")
            user_id = jwt_service.user_id_from_payload(payload)
        except Exception as exc:  # noqa: BLE001
            raise AuthenticationFailed("Invalid access token") from exc

        user = User.objects.filter(id=user_id, is_active=True).first()
        if user is None:
            raise AuthenticationFailed("User not found")

        return user, token
