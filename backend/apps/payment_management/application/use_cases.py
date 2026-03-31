from apps.payment_management.application.dtos import CreatePaymentCommand
from apps.payment_management.application.unit_of_work import AbstractUnitOfWork
from apps.payment_management.domain.entities import PaymentEntity
from apps.payment_management.domain.exceptions import NotFoundError, ValidationError
from apps.payment_management.domain.value_objects import PaymentMethod


class PaymentManagementUseCases:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    def list_payments(self) -> list[PaymentEntity]:
        with self.uow:
            return self.uow.payments.list_all()

    def create_payment(self, command: CreatePaymentCommand) -> PaymentEntity:
        if command.amount <= 0:
            raise ValidationError("Amount must be greater than 0")
        if command.method not in PaymentMethod.values():
            raise ValidationError("Invalid payment method")

        with self.uow:
            if not self.uow.payments.patient_exists(command.patient_id):
                raise NotFoundError("Patient not found")
            if command.session_id and not self.uow.payments.session_exists(command.session_id):
                raise NotFoundError("Session not found")
            payment = self.uow.payments.add(
                patient_id=command.patient_id,
                session_id=command.session_id,
                amount=command.amount,
                method=command.method,
            )
            self.uow.commit()
            return payment

