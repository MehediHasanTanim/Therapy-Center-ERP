from dataclasses import replace
from datetime import datetime
from uuid import uuid4

import pytest

from apps.user_management.application.dtos import CreateUserCommand, DeleteUserCommand
from apps.user_management.application.use_cases import UserManagementUseCases
from apps.user_management.application.unit_of_work import AbstractUnitOfWork
from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.exceptions import ConflictError, ValidationError
from apps.user_management.domain.repositories import UserRepository
from apps.user_management.domain.value_objects import UserRole


class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        self.items: dict = {}

    def list_all(self):
        return list(self.items.values())

    def get_by_id(self, user_id):
        return self.items.get(user_id)

    def get_by_email(self, email):
        for user in self.items.values():
            if user.email.lower() == email.lower():
                return user
        return None

    def add(self, *, name, email, role, password):
        entity = UserEntity(
            id=uuid4(),
            name=name,
            email=email,
            role=UserRole(role),
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.items[entity.id] = entity
        return entity

    def update(self, *, user_id, name, email, role, password):
        old = self.items[user_id]
        updated = replace(old, name=name, email=email, role=UserRole(role), updated_at=datetime.utcnow())
        self.items[user_id] = updated
        return updated

    def delete(self, user_id):
        self.items.pop(user_id, None)


class InMemoryUoW(AbstractUnitOfWork):
    def __init__(self):
        self.users = InMemoryUserRepository()
        self.committed = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def commit(self):
        self.committed = True

    def rollback(self):
        pass


@pytest.fixture
def use_cases():
    return UserManagementUseCases(InMemoryUoW())


def test_create_user_success(use_cases):
    user = use_cases.create_user(
        CreateUserCommand(
            actor_role=UserRole.SUPER_ADMIN.value,
            name="Test Admin",
            email="admin@example.com",
            role=UserRole.ADMIN.value,
            password="secure-pass-123",
        )
    )
    assert user.email == "admin@example.com"
    assert user.role == UserRole.ADMIN


def test_create_user_conflict_email(use_cases):
    command = CreateUserCommand(
        actor_role=UserRole.SUPER_ADMIN.value,
        name="A",
        email="staff@example.com",
        role=UserRole.STAFF.value,
        password="secure-pass-123",
    )
    use_cases.create_user(command)
    with pytest.raises(ConflictError):
        use_cases.create_user(command)


def test_delete_self_forbidden(use_cases):
    actor = use_cases.create_user(
        CreateUserCommand(
            actor_role=UserRole.SUPER_ADMIN.value,
            name="Root",
            email="root@example.com",
            role=UserRole.SUPER_ADMIN.value,
            password="secure-pass-123",
        )
    )

    with pytest.raises(ValidationError):
        use_cases.delete_user(
            DeleteUserCommand(
                actor_role=UserRole.SUPER_ADMIN.value,
                actor_id=actor.id,
                user_id=actor.id,
            )
        )
