from django.contrib import admin

from .infrastructure.models import Therapist, TherapistAvailability


class TherapistAvailabilityInline(admin.TabularInline):
    model = TherapistAvailability
    extra = 0


@admin.register(Therapist)
class TherapistAdmin(admin.ModelAdmin):
    list_display = ("full_name", "specialty", "payout_percentage", "created_at")
    list_editable = ("payout_percentage",)
    search_fields = ("full_name", "specialty")
    inlines = [TherapistAvailabilityInline]


@admin.register(TherapistAvailability)
class TherapistAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("therapist", "day_of_week", "start_hour", "end_hour")
    list_filter = ("day_of_week",)
    search_fields = ("therapist__full_name",)
