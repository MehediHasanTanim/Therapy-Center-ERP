from abc import ABC, abstractmethod

from apps.employee_management.domain.repositories import EmployeeRepository


class AbstractUnitOfWork(ABC):
    employees: EmployeeRepository

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.rollback()

    @abstractmethod
    def commit(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def rollback(self) -> None:
        raise NotImplementedError
