from django.contrib import admin

from .infrastructure.models import Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("title", "therapy_type", "type", "status", "starts_at", "ends_at", "therapist", "patient")
    search_fields = ("title", "therapist__full_name", "patient__full_name")
    list_filter = ("therapy_type", "type", "status")

