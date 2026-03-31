from django.db import transaction

from apps.session_management.application.unit_of_work import AbstractUnitOfWork

from .repositories import DjangoSessionRepository


class DjangoUnitOfWork(AbstractUnitOfWork):
    def __init__(self) -> None:
        self._transaction = None
        self._committed = False
        self.sessions = DjangoSessionRepository()

    def __enter__(self):
        self._committed = False
        self._transaction = transaction.atomic()
        self._transaction.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None or not self._committed:
            transaction.set_rollback(True)
        return self._transaction.__exit__(exc_type, exc, tb)

    def commit(self) -> None:
        self._committed = True

    def rollback(self) -> None:
        transaction.set_rollback(True)

