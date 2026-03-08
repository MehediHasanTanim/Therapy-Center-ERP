class DomainError(Exception):
    pass


class PermissionDeniedError(DomainError):
    pass


class ValidationError(DomainError):
    pass


class NotFoundError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class AuthenticationError(DomainError):
    pass
