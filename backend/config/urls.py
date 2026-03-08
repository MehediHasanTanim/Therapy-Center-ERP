from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.patient_management.presentation.views import PatientViewSet
from apps.user_management.presentation.auth_views import LoginView, MeView, RefreshTokenView
from apps.user_management.presentation.views import UserViewSet

router = DefaultRouter(trailing_slash=r"/?")
router.register(r"users", UserViewSet, basename="users")
router.register(r"patients", PatientViewSet, basename="patients")

user_list_no_slash = UserViewSet.as_view({"get": "list", "post": "create"})
user_detail_no_slash = UserViewSet.as_view({"get": "retrieve", "put": "update", "patch": "update", "delete": "destroy"})

patient_list_no_slash = PatientViewSet.as_view({"get": "list", "post": "create"})
patient_detail_no_slash = PatientViewSet.as_view({"get": "retrieve", "put": "update", "patch": "update", "delete": "destroy"})
patient_document_no_slash = PatientViewSet.as_view({"post": "upload_document"})
patient_document_delete_no_slash = PatientViewSet.as_view({"delete": "delete_document"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/v1/auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("api/v1/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/v1/users", user_list_no_slash, name="users-list-no-slash"),
    path("api/v1/users/<uuid:pk>", user_detail_no_slash, name="users-detail-no-slash"),
    path("api/v1/patients", patient_list_no_slash, name="patients-list-no-slash"),
    path("api/v1/patients/<uuid:pk>", patient_detail_no_slash, name="patients-detail-no-slash"),
    path("api/v1/patients/<uuid:pk>/documents", patient_document_no_slash, name="patients-documents-no-slash"),
    path("api/v1/patients/<uuid:pk>/documents/<uuid:doc_id>", patient_document_delete_no_slash, name="patients-documents-delete-no-slash"),
    path("api/v1/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
