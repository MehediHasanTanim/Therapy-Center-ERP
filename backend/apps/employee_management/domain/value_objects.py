from enum import Enum


class EmploymentStatus(str, Enum):
    PROBATION = "probation"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"

    @classmethod
    def values(cls):
        return [item.value for item in cls]


class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"

    @classmethod
    def values(cls):
        return [item.value for item in cls]


class Department(str, Enum):
    CLINICAL = "clinical"
    ADMIN = "admin"
    SUPPORT = "support"

    @classmethod
    def values(cls):
        return [item.value for item in cls]


class PayType(str, Enum):
    SALARY = "salary"
    HOURLY = "hourly"

    @classmethod
    def values(cls):
        return [item.value for item in cls]
