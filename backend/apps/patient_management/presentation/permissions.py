from rest_framework.permissions import BasePermission

from apps.user_management.domain.value_objects import UserRole


class IsTherapyStaffOrAbove(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.role in {UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value, UserRole.STAFF.value}
