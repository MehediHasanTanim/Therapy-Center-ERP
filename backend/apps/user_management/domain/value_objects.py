from enum import StrEnum


class UserRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    STAFF = "staff"

    @classmethod
    def values(cls) -> list[str]:
        return [role.value for role in cls]
