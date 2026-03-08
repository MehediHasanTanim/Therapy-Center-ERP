from abc import ABC, abstractmethod
from uuid import UUID

from .entities import UserEntity


class UserRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[UserEntity]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: UUID) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def verify_credentials(self, *, email: str, password: str) -> UserEntity | None:
        raise NotImplementedError

    @abstractmethod
    def add(self, *, name: str, email: str, role: str, password: str) -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def update(self, *, user_id: UUID, name: str, email: str, role: str, password: str | None) -> UserEntity:
        raise NotImplementedError

    @abstractmethod
    def delete(self, user_id: UUID) -> None:
        raise NotImplementedError
