from abc import ABC, abstractmethod

from apps.session_management.domain.repositories import SessionRepository


class AbstractUnitOfWork(ABC):
    sessions: SessionRepository

    @abstractmethod
    def __enter__(self):
        raise NotImplementedError

    @abstractmethod
    def __exit__(self, exc_type, exc, tb):
        raise NotImplementedError

    @abstractmethod
    def commit(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def rollback(self) -> None:
        raise NotImplementedError

