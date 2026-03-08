from uuid import UUID

from apps.user_management.application.dtos import CreateUserCommand, DeleteUserCommand, UpdateUserCommand
from apps.user_management.application.unit_of_work import AbstractUnitOfWork
from apps.user_management.domain.entities import UserEntity
from apps.user_management.domain.exceptions import ConflictError, NotFoundError, ValidationError
from apps.user_management.domain.services import UserPolicyService


class UserManagementUseCases:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    def list_users(self) -> list[UserEntity]:
        with self.uow:
            return self.uow.users.list_all()

    def get_user(self, user_id: UUID) -> UserEntity:
        with self.uow:
            user = self.uow.users.get_by_id(user_id)
            if user is None:
                raise NotFoundError("User not found")
            return user

    def create_user(self, command: CreateUserCommand) -> UserEntity:
        UserPolicyService.assert_actor_can_manage(actor_role=command.actor_role, target_role=command.role)
        if len(command.password) < 8:
            raise ValidationError("Password must be at least 8 characters")

        with self.uow:
            existing = self.uow.users.get_by_email(command.email)
            if existing:
                raise ConflictError("Email already exists")
            user = self.uow.users.add(
                name=command.name,
                email=command.email,
                role=command.role,
                password=command.password,
            )
            self.uow.commit()
            return user

    def update_user(self, command: UpdateUserCommand) -> UserEntity:
        UserPolicyService.assert_actor_can_manage(actor_role=command.actor_role, target_role=command.role)
        if command.password is not None and command.password != "" and len(command.password) < 8:
            raise ValidationError("Password must be at least 8 characters")

        with self.uow:
            target = self.uow.users.get_by_id(command.user_id)
            if target is None:
                raise NotFoundError("User not found")
            duplicate = self.uow.users.get_by_email(command.email)
            if duplicate and duplicate.id != command.user_id:
                raise ConflictError("Email already exists")
            updated = self.uow.users.update(
                user_id=command.user_id,
                name=command.name,
                email=command.email,
                role=command.role,
                password=command.password if command.password else None,
            )
            self.uow.commit()
            return updated

    def delete_user(self, command: DeleteUserCommand) -> None:
        with self.uow:
            target = self.uow.users.get_by_id(command.user_id)
            if target is None:
                raise NotFoundError("User not found")
            UserPolicyService.assert_actor_can_delete(
                actor_role=command.actor_role,
                target_role=target.role.value,
                is_self=command.actor_id == command.user_id,
            )
            self.uow.users.delete(command.user_id)
            self.uow.commit()
