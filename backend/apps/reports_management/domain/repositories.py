from abc import ABC, abstractmethod
from datetime import date


class ReportsRepository(ABC):
    @abstractmethod
    def daily_schedule_overview(self, target_date: date) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def attendance_completion(self, start_date: date, end_date: date) -> dict:
        raise NotImplementedError

    @abstractmethod
    def therapist_utilization(self, start_date: date, end_date: date) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def patient_engagement(self, start_date: date, end_date: date) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def therapy_type_distribution(self, start_date: date, end_date: date) -> list[dict]:
        raise NotImplementedError

    @abstractmethod
    def assessment_pipeline(self, start_date: date, end_date: date) -> dict:
        raise NotImplementedError

    @abstractmethod
    def care_plan_adherence(self, start_date: date, end_date: date) -> dict:
        raise NotImplementedError

    @abstractmethod
    def revenue_summary(self, start_date: date, end_date: date, method: str | None = None, therapy_type: str | None = None) -> dict:
        raise NotImplementedError

    @abstractmethod
    def payment_status(
        self,
        start_date: date,
        end_date: date,
        method: str | None = None,
        therapy_type: str | None = None,
        payment_status: str | None = None,
    ) -> dict:
        raise NotImplementedError

    @abstractmethod
    def therapist_payouts(self, start_date: date, end_date: date, method: str | None = None, therapy_type: str | None = None) -> dict:
        raise NotImplementedError

    @abstractmethod
    def conflict_report(self, start_date: date, end_date: date) -> dict:
        raise NotImplementedError

    @abstractmethod
    def no_show_cancellation_reasons(self, start_date: date, end_date: date) -> dict:
        raise NotImplementedError

    @abstractmethod
    def audit_trail(
        self,
        start_date: date,
        end_date: date,
        user_id: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        search: str | None = None,
    ) -> dict:
        raise NotImplementedError

    @abstractmethod
    def document_activity(
        self,
        start_date: date,
        end_date: date,
        patient_id: str | None = None,
        action: str | None = None,
    ) -> dict:
        raise NotImplementedError
