from .exceptions import PermissionDeniedError, ValidationError
from .value_objects import UserRole


class UserPolicyService:
    @staticmethod
    def assert_actor_can_manage(*, actor_role: str, target_role: str) -> None:
        if actor_role not in UserRole.values() or target_role not in UserRole.values():
            raise ValidationError("Invalid role")

        if actor_role == UserRole.SUPER_ADMIN.value:
            return

        if actor_role == UserRole.ADMIN.value and target_role != UserRole.SUPER_ADMIN.value:
            return

        raise PermissionDeniedError("You do not have permission to manage this role")

    @staticmethod
    def assert_actor_can_delete(*, actor_role: str, target_role: str, is_self: bool) -> None:
        if is_self:
            raise ValidationError("You cannot delete your own account")
        UserPolicyService.assert_actor_can_manage(actor_role=actor_role, target_role=target_role)
