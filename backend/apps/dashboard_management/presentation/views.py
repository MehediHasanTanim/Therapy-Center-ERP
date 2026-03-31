from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard_management.application.use_cases import DashboardUseCases
from apps.dashboard_management.infrastructure.repositories import DjangoDashboardRepository
from apps.patient_management.presentation.permissions import IsTherapyStaffOrAbove


class DashboardStatsView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        use_cases = DashboardUseCases(DjangoDashboardRepository())
        stats = use_cases.get_stats()
        return Response(
            {
                "totalPatients": stats.total_patients,
                "totalTherapists": stats.total_therapists,
                "upcomingSessionsToday": stats.upcoming_sessions_today,
                "upcomingSessionsTomorrow": stats.upcoming_sessions_tomorrow,
                "revenueCurrentMonth": stats.revenue_current_month,
            }
        )


class AppConfigView(APIView):
    permission_classes = [IsTherapyStaffOrAbove]

    def get(self, request):
        return Response({"defaultNoShowReason": settings.DEFAULT_NO_SHOW_REASON})
