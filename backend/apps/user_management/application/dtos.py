from dataclasses import dataclass
from uuid import UUID


@dataclass(slots=True)
class CreateUserCommand:
    actor_role: str
    name: str
    email: str
    role: str
    password: str


@dataclass(slots=True)
class UpdateUserCommand:
    actor_role: str
    user_id: UUID
    name: str
    email: str
    role: str
    password: str | None = None


@dataclass(slots=True)
class DeleteUserCommand:
    actor_role: str
    actor_id: UUID
    user_id: UUID
