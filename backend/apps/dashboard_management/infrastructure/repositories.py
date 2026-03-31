from django.db.models import Sum
from django.utils import timezone

from apps.dashboard_management.domain.entities import DashboardStatsEntity
from apps.dashboard_management.domain.repositories import DashboardRepository
from apps.patient_management.infrastructure.models import Patient
from apps.payment_management.infrastructure.models import Payment
from apps.session_management.infrastructure.models import Session
from apps.therapist_management.infrastructure.models import Therapist


class DjangoDashboardRepository(DashboardRepository):
    def get_stats(self) -> DashboardStatsEntity:
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + timezone.timedelta(days=1)
        day_after_start = tomorrow_start + timezone.timedelta(days=1)
        month_start = today_start.replace(day=1)

        total_patients = Patient.objects.count()
        total_therapists = Therapist.objects.count()
        upcoming_sessions_today = Session.objects.filter(
            status="scheduled", starts_at__gte=today_start, starts_at__lt=tomorrow_start
        ).count()
        upcoming_sessions_tomorrow = Session.objects.filter(
            status="scheduled", starts_at__gte=tomorrow_start, starts_at__lt=day_after_start
        ).count()
        total_revenue = (
            Payment.objects.filter(created_at__gte=month_start)
            .aggregate(total=Sum("amount"))
            .get("total")
            or 0
        )
        return DashboardStatsEntity(
            total_patients=total_patients,
            total_therapists=total_therapists,
            upcoming_sessions_today=upcoming_sessions_today,
            upcoming_sessions_tomorrow=upcoming_sessions_tomorrow,
            revenue_current_month=float(total_revenue),
        )
