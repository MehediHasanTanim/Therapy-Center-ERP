import calendar
from datetime import timedelta

from apps.session_management.application.dtos import CreateSessionCommand, RescheduleSessionCommand
from apps.session_management.application.unit_of_work import AbstractUnitOfWork
from apps.session_management.domain.entities import SessionEntity
from apps.session_management.domain.exceptions import ConflictError, NotFoundError, ValidationError
from apps.session_management.domain.value_objects import THERAPY_SPECIALTY_MAP, SessionKind, SessionStatus, TherapyType


class SessionManagementUseCases:
    def __init__(self, uow: AbstractUnitOfWork) -> None:
        self.uow = uow

    def list_sessions(self) -> list[SessionEntity]:
        with self.uow:
            return self.uow.sessions.list_all()

    def create_session(self, command: CreateSessionCommand) -> list[SessionEntity]:
        self._validate_time_range(command.starts_at, command.ends_at)
        self._validate_therapy_type(command.therapy_type)
        self._validate_session_kind(command.type)
        if len(command.title.strip()) == 0:
            raise ValidationError("title is required")

        occurrences = self._build_occurrences(command.starts_at, command.ends_at, command.recurrence)

        with self.uow:
            if not self.uow.sessions.patient_exists(command.patient_id):
                raise NotFoundError("Patient not found")
            if not self.uow.sessions.therapist_exists(command.therapist_id):
                raise NotFoundError("Therapist not found")

            specialty = self.uow.sessions.therapist_specialty(command.therapist_id)
            self._validate_therapy_specialty_match(command.therapy_type, specialty or "")

            created: list[SessionEntity] = []
            for starts_at, ends_at in occurrences:
                self._validate_time_range(starts_at, ends_at)
                if self.uow.sessions.has_therapist_conflict(
                    therapist_id=command.therapist_id,
                    starts_at=starts_at,
                    ends_at=ends_at,
                ):
                    self.uow.sessions.log_conflict(
                        patient_id=command.patient_id,
                        therapist_id=command.therapist_id,
                        therapy_type=command.therapy_type,
                        session_type=command.type,
                        starts_at=starts_at,
                        ends_at=ends_at,
                        action="create",
                        reason="Therapist already booked",
                    )
                    self.uow.commit()
                    raise ConflictError("Therapist is already booked for this time range.")

                session = self.uow.sessions.add(
                    patient_id=command.patient_id,
                    therapist_id=command.therapist_id,
                    therapy_type=command.therapy_type,
                    title=command.title.strip(),
                    starts_at=starts_at,
                    ends_at=ends_at,
                    status=SessionStatus.SCHEDULED.value,
                    type=command.type,
                    cancellation_reason=command.cancellation_reason,
                    no_show_reason=command.no_show_reason,
                )
                created.append(session)
            self.uow.commit()
            return created

    def reschedule_session(self, command: RescheduleSessionCommand) -> SessionEntity:
        self._validate_time_range(command.starts_at, command.ends_at)

        with self.uow:
            existing = self.uow.sessions.get_by_id(command.session_id)
            if existing is None:
                raise NotFoundError("Session not found")
            if existing.status == SessionStatus.CANCELLED.value:
                raise ValidationError("Cancelled sessions cannot be rescheduled")
            if self.uow.sessions.has_therapist_conflict(
                therapist_id=existing.therapist_id,
                starts_at=command.starts_at,
                ends_at=command.ends_at,
                exclude_session_id=existing.id,
            ):
                self.uow.sessions.log_conflict(
                    patient_id=existing.patient_id,
                    therapist_id=existing.therapist_id,
                    therapy_type=existing.therapy_type,
                    session_type=existing.type,
                    starts_at=command.starts_at,
                    ends_at=command.ends_at,
                    action="reschedule",
                    reason="Therapist already booked",
                )
                self.uow.commit()
                raise ConflictError("Therapist is already booked for this time range.")

            session = self.uow.sessions.reschedule(
                session_id=command.session_id,
                starts_at=command.starts_at,
                ends_at=command.ends_at,
            )
            self.uow.commit()
            return session

    def update_session_status(self, session_id, status: str, cancellation_reason: str | None, no_show_reason: str | None) -> SessionEntity:
        if status not in SessionStatus.values():
            raise ValidationError("Invalid status")
        if status != SessionStatus.CANCELLED.value:
            cancellation_reason = None
            no_show_reason = None
        with self.uow:
            existing = self.uow.sessions.get_by_id(session_id)
            if existing is None:
                raise NotFoundError("Session not found")
            session = self.uow.sessions.update_status(
                session_id=session_id,
                status=status,
                cancellation_reason=cancellation_reason,
                no_show_reason=no_show_reason,
            )
            self.uow.commit()
            return session

    def delete_session(self, session_id) -> None:
        with self.uow:
            existing = self.uow.sessions.get_by_id(session_id)
            if existing is None:
                raise NotFoundError("Session not found")
            self.uow.sessions.delete(session_id)
            self.uow.commit()

    @staticmethod
    def _validate_time_range(starts_at, ends_at) -> None:
        if starts_at >= ends_at:
            raise ValidationError("startsAt must be earlier than endsAt")

    @staticmethod
    def _validate_therapy_type(therapy_type: str) -> None:
        if therapy_type not in TherapyType.values():
            raise ValidationError("Invalid therapyType")

    @staticmethod
    def _validate_session_kind(kind: str) -> None:
        if kind not in SessionKind.values():
            raise ValidationError("Invalid session type")

    @staticmethod
    def _validate_therapy_specialty_match(therapy_type: str, specialty: str) -> None:
        if therapy_type == TherapyType.OTHER.value:
            return
        expected = THERAPY_SPECIALTY_MAP[therapy_type]
        if expected != specialty:
            raise ValidationError(f"Therapist specialty must be '{expected}' for therapy type '{therapy_type}'")

    @staticmethod
    def _build_occurrences(starts_at, ends_at, recurrence: dict | None):
        if not recurrence:
            return [(starts_at, ends_at)]

        pattern = recurrence.get("pattern") or {}
        range_info = recurrence.get("range") or {}

        frequency = pattern.get("type")
        if frequency not in {"daily", "weekly", "monthly"}:
            raise ValidationError("Invalid recurrence frequency")

        interval_value = max(1, int(pattern.get("interval") or 1))
        range_type = range_info.get("type", "endAfter")

        max_occurrences = 365
        if range_type == "endAfter":
            count_value = int(range_info.get("count") or 1)
            if count_value < 1:
                raise ValidationError("recurrence count must be at least 1")
            if count_value > max_occurrences:
                raise ValidationError("recurrence count is too large")
            end_date_limit = None
        elif range_type == "endBy":
            end_date_limit = range_info.get("endDate")
            if not end_date_limit:
                raise ValidationError("endDate is required for endBy")
            count_value = max_occurrences
        else:
            count_value = max_occurrences
            end_date_limit = (starts_at + timedelta(days=365)).date()

        duration = ends_at - starts_at
        occurrences: list[tuple] = []

        if frequency == "daily":
            cursor = starts_at
            while len(occurrences) < count_value:
                if SessionManagementUseCases._passes_end_limit(cursor, end_date_limit):
                    break
                occurrences.append((cursor, cursor + duration))
                cursor = cursor + timedelta(days=interval_value)
        elif frequency == "weekly":
            days_of_week = pattern.get("daysOfWeek") or []
            if not days_of_week:
                days_of_week = [SessionManagementUseCases._weekday_sun0(starts_at)]
            start_date = starts_at.date()
            cursor = starts_at
            while len(occurrences) < count_value:
                if SessionManagementUseCases._passes_end_limit(cursor, end_date_limit):
                    break
                days_since_start = (cursor.date() - start_date).days
                week_index = days_since_start // 7
                weekday = SessionManagementUseCases._weekday_sun0(cursor)
                if week_index % interval_value == 0 and weekday in days_of_week:
                    occurrences.append((cursor, cursor + duration))
                cursor = cursor + timedelta(days=1)
        else:
            day_of_month = pattern.get("dayOfMonth")
            week_of_month = pattern.get("weekOfMonth")
            day_of_week = pattern.get("dayOfWeek")
            for index in range(count_value):
                current_start = SessionManagementUseCases._add_months(starts_at, index * interval_value)
                if day_of_month:
                    current_start = SessionManagementUseCases._set_day_of_month(current_start, int(day_of_month))
                elif week_of_month and day_of_week is not None:
                    current_start = SessionManagementUseCases._set_weekday_of_month(
                        current_start, int(week_of_month), int(day_of_week)
                    )
                if current_start < starts_at:
                    continue
                if SessionManagementUseCases._passes_end_limit(current_start, end_date_limit):
                    break
                occurrences.append((current_start, current_start + duration))

        return occurrences[:max_occurrences]

    @staticmethod
    def _add_months(value, months: int):
        year = value.year + (value.month - 1 + months) // 12
        month = (value.month - 1 + months) % 12 + 1
        day = min(value.day, calendar.monthrange(year, month)[1])
        return value.replace(year=year, month=month, day=day)

    @staticmethod
    def _set_day_of_month(value, day_of_month: int):
        day = min(day_of_month, calendar.monthrange(value.year, value.month)[1])
        return value.replace(day=day)

    @staticmethod
    def _set_weekday_of_month(value, week_of_month: int, day_of_week: int):
        target_weekday = (day_of_week + 6) % 7  # convert Sunday=0 to Monday=0
        if week_of_month == -1:
            last_day = calendar.monthrange(value.year, value.month)[1]
            date_cursor = value.replace(day=last_day)
            while date_cursor.weekday() != target_weekday:
                date_cursor = date_cursor - timedelta(days=1)
            return date_cursor

        first_day = value.replace(day=1)
        offset = (target_weekday - first_day.weekday()) % 7
        day = 1 + offset + (week_of_month - 1) * 7
        last_day = calendar.monthrange(value.year, value.month)[1]
        if day > last_day:
            day = last_day
        return value.replace(day=day)

    @staticmethod
    def _weekday_sun0(value):
        return (value.weekday() + 1) % 7

    @staticmethod
    def _passes_end_limit(current_start, end_date_limit):
        if not end_date_limit:
            return False
        if hasattr(end_date_limit, "date"):
            limit_date = end_date_limit
        else:
            limit_date = end_date_limit
        return current_start.date() > limit_date
