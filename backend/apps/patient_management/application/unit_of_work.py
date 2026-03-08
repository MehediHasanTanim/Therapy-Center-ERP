from abc import ABC, abstractmethod

from apps.patient_management.domain.repositories import PatientRepository


class AbstractUnitOfWork(ABC):
    patients: PatientRepository

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
