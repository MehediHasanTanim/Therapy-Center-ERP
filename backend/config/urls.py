from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.patient_management.presentation.views import PatientViewSet
from apps.employee_management.presentation.views import EmployeeViewSet
from apps.dashboard_management.presentation.views import AppConfigView, DashboardStatsView
from apps.payment_management.presentation.views import PaymentViewSet
from apps.reports_management.presentation.views import (
    AttendanceCompletionView,
    AssessmentPipelineView,
    CarePlanAdherenceView,
    ConflictReportView,
    DailyScheduleOverviewView,
    NoShowCancellationReasonsView,
    PatientEngagementView,
    PaymentStatusView,
    RevenueSummaryView,
    AuditTrailReportView,
    DocumentActivityReportView,
    TherapistUtilizationView,
    TherapistPayoutsView,
    TherapyTypeDistributionView,
)
from apps.session_management.presentation.views import SessionViewSet
from apps.therapist_management.presentation.views import TherapistViewSet
from apps.user_management.presentation.auth_views import LoginView, MeView, RefreshTokenView
from apps.user_management.presentation.views import UserViewSet

router = DefaultRouter(trailing_slash=r"/?")
router.register(r"users", UserViewSet, basename="users")
router.register(r"patients", PatientViewSet, basename="patients")
router.register(r"employees", EmployeeViewSet, basename="employees")
router.register(r"therapists", TherapistViewSet, basename="therapists")
router.register(r"sessions", SessionViewSet, basename="sessions")
router.register(r"payments", PaymentViewSet, basename="payments")

user_list_no_slash = UserViewSet.as_view({"get": "list", "post": "create"})
user_detail_no_slash = UserViewSet.as_view({"get": "retrieve", "put": "update", "patch": "update", "delete": "destroy"})

patient_list_no_slash = PatientViewSet.as_view({"get": "list", "post": "create"})
patient_detail_no_slash = PatientViewSet.as_view({"get": "retrieve", "put": "update", "patch": "update", "delete": "destroy"})
patient_document_no_slash = PatientViewSet.as_view({"post": "upload_document"})
patient_document_delete_no_slash = PatientViewSet.as_view({"delete": "delete_document"})
employee_list_no_slash = EmployeeViewSet.as_view({"get": "list", "post": "create"})
employee_detail_no_slash = EmployeeViewSet.as_view({"get": "retrieve", "put": "update", "patch": "update", "delete": "destroy"})
employee_document_no_slash = EmployeeViewSet.as_view({"post": "upload_document"})
employee_document_delete_no_slash = EmployeeViewSet.as_view({"delete": "delete_document"})
therapist_list_no_slash = TherapistViewSet.as_view({"get": "list", "post": "create"})
therapist_detail_no_slash = TherapistViewSet.as_view({"get": "retrieve", "put": "update", "patch": "update", "delete": "destroy"})
session_list_no_slash = SessionViewSet.as_view({"get": "list", "post": "create"})
session_detail_no_slash = SessionViewSet.as_view({"delete": "destroy"})
session_reschedule_no_slash = SessionViewSet.as_view({"patch": "reschedule"})
session_status_no_slash = SessionViewSet.as_view({"patch": "update_status"})
payment_list_no_slash = PaymentViewSet.as_view({"get": "list", "post": "create"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/v1/auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("api/v1/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/v1/dashboard/stats", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("api/v1/config", AppConfigView.as_view(), name="app-config"),
    path("api/v1/reports/core/daily-schedule", DailyScheduleOverviewView.as_view(), name="reports-core-daily-schedule"),
    path("api/v1/reports/core/attendance-completion", AttendanceCompletionView.as_view(), name="reports-core-attendance-completion"),
    path("api/v1/reports/core/therapist-utilization", TherapistUtilizationView.as_view(), name="reports-core-therapist-utilization"),
    path("api/v1/reports/core/patient-engagement", PatientEngagementView.as_view(), name="reports-core-patient-engagement"),
    path("api/v1/reports/quality/therapy-type-distribution", TherapyTypeDistributionView.as_view(), name="reports-quality-therapy-type"),
    path("api/v1/reports/quality/assessment-pipeline", AssessmentPipelineView.as_view(), name="reports-quality-assessment-pipeline"),
    path("api/v1/reports/quality/care-plan-adherence", CarePlanAdherenceView.as_view(), name="reports-quality-care-plan-adherence"),
    path("api/v1/reports/financial/revenue-summary", RevenueSummaryView.as_view(), name="reports-financial-revenue-summary"),
    path("api/v1/reports/financial/payment-status", PaymentStatusView.as_view(), name="reports-financial-payment-status"),
    path("api/v1/reports/financial/therapist-payouts", TherapistPayoutsView.as_view(), name="reports-financial-therapist-payouts"),
    path("api/v1/reports/operational/conflicts", ConflictReportView.as_view(), name="reports-operational-conflicts"),
    path("api/v1/reports/operational/no-show-cancellations", NoShowCancellationReasonsView.as_view(), name="reports-operational-no-show"),
    path("api/v1/reports/compliance/audit-trail", AuditTrailReportView.as_view(), name="reports-compliance-audit-trail"),
    path("api/v1/reports/compliance/document-activity", DocumentActivityReportView.as_view(), name="reports-compliance-document-activity"),
    path("api/v1/users", user_list_no_slash, name="users-list-no-slash"),
    path("api/v1/users/<uuid:pk>", user_detail_no_slash, name="users-detail-no-slash"),
    path("api/v1/patients", patient_list_no_slash, name="patients-list-no-slash"),
    path("api/v1/patients/<uuid:pk>", patient_detail_no_slash, name="patients-detail-no-slash"),
    path("api/v1/patients/<uuid:pk>/documents", patient_document_no_slash, name="patients-documents-no-slash"),
    path("api/v1/patients/<uuid:pk>/documents/<uuid:doc_id>", patient_document_delete_no_slash, name="patients-documents-delete-no-slash"),
    path("api/v1/employees", employee_list_no_slash, name="employees-list-no-slash"),
    path("api/v1/employees/<uuid:pk>", employee_detail_no_slash, name="employees-detail-no-slash"),
    path("api/v1/employees/<uuid:pk>/documents", employee_document_no_slash, name="employees-documents-no-slash"),
    path("api/v1/employees/<uuid:pk>/documents/<uuid:doc_id>", employee_document_delete_no_slash, name="employees-documents-delete-no-slash"),
    path("api/v1/therapists", therapist_list_no_slash, name="therapists-list-no-slash"),
    path("api/v1/therapists/<uuid:pk>", therapist_detail_no_slash, name="therapists-detail-no-slash"),
    path("api/v1/sessions", session_list_no_slash, name="sessions-list-no-slash"),
    path("api/v1/sessions/<uuid:pk>", session_detail_no_slash, name="sessions-detail-no-slash"),
    path("api/v1/sessions/<uuid:pk>/reschedule", session_reschedule_no_slash, name="sessions-reschedule-no-slash"),
    path("api/v1/sessions/<uuid:pk>/status", session_status_no_slash, name="sessions-status-no-slash"),
    path("api/v1/payments", payment_list_no_slash, name="payments-list-no-slash"),
    path("api/v1/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
