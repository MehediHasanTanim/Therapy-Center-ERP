from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .value_objects import UserRole


@dataclass(slots=True)
class UserEntity:
    id: UUID
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
