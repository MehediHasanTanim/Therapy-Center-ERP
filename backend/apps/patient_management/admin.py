from django.contrib import admin

from .infrastructure.models import Patient, PatientDocument


class PatientDocumentInline(admin.TabularInline):
    model = PatientDocument
    extra = 0
    readonly_fields = ("version", "uploaded_at")


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "parent_name", "spectrum", "phone", "created_at")
    search_fields = ("full_name", "parent_name", "phone")
    list_filter = ("spectrum",)
    inlines = [PatientDocumentInline]


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ("patient", "file_name", "content_type", "size", "version", "uploaded_at")
    search_fields = ("file_name", "patient__full_name")
