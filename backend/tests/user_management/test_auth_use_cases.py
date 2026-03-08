from datetime import datetime
from uuid import uuid4

import pytest

from apps.user_management.application.auth_dtos import LoginCommand
from apps.user_management.application.auth_use_cases import AuthUseCases
from apps.user_management.application.unit_of_work import AbstractUnitOfWork
from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.exceptions import AuthenticationError
from apps.user_management.domain.repositories import UserRepository
from apps.user_management.domain.value_objects import UserRole


class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self.user = UserEntity(
            id=uuid4(),
            name="Admin",
            email="admin@example.com",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    def list_all(self):
        return [self.user]

    def get_by_id(self, user_id):
        return self.user if self.user.id == user_id else None

    def get_by_email(self, email):
        return self.user if self.user.email == email else None

    def verify_credentials(self, *, email, password):
        if email == self.user.email and password == "secret123":
            return self.user
        return None

    def add(self, *, name, email, role, password):
        raise NotImplementedError

    def update(self, *, user_id, name, email, role, password):
        raise NotImplementedError

    def delete(self, user_id):
        raise NotImplementedError


class FakeUoW(AbstractUnitOfWork):
    def __init__(self):
        self.users = InMemoryUserRepository()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def commit(self):
        pass

    def rollback(self):
        pass


class FakeJWTService:
    def generate_access_token(self, user):
        return f"access-{user.id}"

    def generate_refresh_token(self, user):
        return f"refresh-{user.id}"


@pytest.fixture
def use_cases():
    return AuthUseCases(FakeUoW(), FakeJWTService())


def test_login_success(use_cases):
    user, access, refresh = use_cases.login(LoginCommand(email="admin@example.com", password="secret123"))
    assert user.email == "admin@example.com"
    assert access.startswith("access-")
    assert refresh.startswith("refresh-")


def test_login_invalid_credentials(use_cases):
    with pytest.raises(AuthenticationError):
        use_cases.login(LoginCommand(email="admin@example.com", password="wrong-pass"))
