from datetime import date

from apps.reports_management.domain.repositories import ReportsRepository


class ReportsUseCases:
    def __init__(self, repository: ReportsRepository) -> None:
        self.repository = repository

    def daily_schedule_overview(self, target_date: date) -> list[dict]:
        return self.repository.daily_schedule_overview(target_date)

    def attendance_completion(self, start_date: date, end_date: date) -> dict:
        return self.repository.attendance_completion(start_date, end_date)

    def therapist_utilization(self, start_date: date, end_date: date) -> list[dict]:
        return self.repository.therapist_utilization(start_date, end_date)

    def patient_engagement(self, start_date: date, end_date: date) -> list[dict]:
        return self.repository.patient_engagement(start_date, end_date)

    def therapy_type_distribution(self, start_date: date, end_date: date) -> list[dict]:
        return self.repository.therapy_type_distribution(start_date, end_date)

    def assessment_pipeline(self, start_date: date, end_date: date) -> dict:
        return self.repository.assessment_pipeline(start_date, end_date)

    def care_plan_adherence(self, start_date: date, end_date: date) -> dict:
        return self.repository.care_plan_adherence(start_date, end_date)

    def revenue_summary(self, start_date: date, end_date: date, method: str | None = None, therapy_type: str | None = None) -> dict:
        return self.repository.revenue_summary(start_date, end_date, method=method, therapy_type=therapy_type)

    def payment_status(
        self,
        start_date: date,
        end_date: date,
        method: str | None = None,
        therapy_type: str | None = None,
        payment_status: str | None = None,
    ) -> dict:
        return self.repository.payment_status(
            start_date, end_date, method=method, therapy_type=therapy_type, payment_status=payment_status
        )

    def therapist_payouts(self, start_date: date, end_date: date, method: str | None = None, therapy_type: str | None = None) -> dict:
        return self.repository.therapist_payouts(start_date, end_date, method=method, therapy_type=therapy_type)

    def conflict_report(self, start_date: date, end_date: date) -> dict:
        return self.repository.conflict_report(start_date, end_date)

    def no_show_cancellation_reasons(self, start_date: date, end_date: date) -> dict:
        return self.repository.no_show_cancellation_reasons(start_date, end_date)

    def audit_trail(
        self,
        start_date: date,
        end_date: date,
        user_id: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        search: str | None = None,
        patient_id: str | None = None,
        therapist_id: str | None = None,
    ) -> dict:
        return self.repository.audit_trail(
            start_date,
            end_date,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            search=search,
            patient_id=patient_id,
            therapist_id=therapist_id,
        )

    def document_activity(
        self,
        start_date: date,
        end_date: date,
        patient_id: str | None = None,
        action: str | None = None,
    ) -> dict:
        return self.repository.document_activity(start_date, end_date, patient_id=patient_id, action=action)
