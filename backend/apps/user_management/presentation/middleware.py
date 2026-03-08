from django.contrib.auth.models import AnonymousUser

from apps.user_management.infrastructure.jwt_service import JWTService
from apps.user_management.infrastructure.models import User


class JWTAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            jwt_service = JWTService()
            try:
                payload = jwt_service.decode(token, expected_type="access")
                user_id = jwt_service.user_id_from_payload(payload)
                user = User.objects.filter(id=user_id, is_active=True).first()
                if user is not None:
                    request.user = user
                    request.jwt_payload = payload
            except Exception:  # noqa: BLE001
                request.user = request.user if hasattr(request, "user") else AnonymousUser()

        return self.get_response(request)
