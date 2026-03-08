from uuid import UUID

from django.contrib.auth.hashers import check_password, make_password

from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.repositories import UserRepository
from apps.user_management.domain.value_objects import UserRole

from .models import User


def _to_entity(model: User) -> UserEntity:
    return UserEntity(
        id=model.id,
        name=model.name,
        email=model.email,
        role=UserRole(model.role),
        is_active=model.is_active,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


class DjangoUserRepository(UserRepository):
    def list_all(self) -> list[UserEntity]:
        return [_to_entity(user) for user in User.objects.order_by("created_at")]

    def get_by_id(self, user_id: UUID) -> UserEntity | None:
        model = User.objects.filter(id=user_id).first()
        return _to_entity(model) if model else None

    def get_by_email(self, email: str) -> UserEntity | None:
        model = User.objects.filter(email__iexact=email).first()
        return _to_entity(model) if model else None

    def verify_credentials(self, *, email: str, password: str) -> UserEntity | None:
        model = User.objects.filter(email__iexact=email).first()
        if model is None:
            return None
        if not check_password(password, model.password):
            return None
        return _to_entity(model)

    def add(self, *, name: str, email: str, role: str, password: str) -> UserEntity:
        model = User.objects.create(
            name=name,
            email=email,
            role=role,
            password=make_password(password),
        )
        return _to_entity(model)

    def update(self, *, user_id: UUID, name: str, email: str, role: str, password: str | None) -> UserEntity:
        model = User.objects.get(id=user_id)
        model.name = name
        model.email = email
        model.role = role
        if password:
            model.password = make_password(password)
        model.save(update_fields=["name", "email", "role", "password", "updated_at", "is_staff"])
        return _to_entity(model)

    def delete(self, user_id: UUID) -> None:
        User.objects.filter(id=user_id).delete()
