from django.contrib import admin

from .infrastructure.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("patient", "session", "amount", "method", "created_at")
    search_fields = ("patient__full_name", "session__title", "method")
    list_filter = ("method",)

