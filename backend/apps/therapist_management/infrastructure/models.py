import uuid

from django.db import models


class Therapist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    specialty = models.CharField(max_length=128)
    payout_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=70.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "therapists"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(payout_percentage__gte=0) & models.Q(payout_percentage__lte=100),
                name="chk_therapist_payout_percentage_range",
            )
        ]


class TherapistAvailability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    therapist = models.ForeignKey(Therapist, on_delete=models.CASCADE, related_name="availability")
    day_of_week = models.PositiveSmallIntegerField()
    start_hour = models.TimeField()
    end_hour = models.TimeField()

    class Meta:
        db_table = "therapist_availability"
        ordering = ["day_of_week", "start_hour"]
        constraints = [
            models.CheckConstraint(condition=models.Q(day_of_week__gte=0) & models.Q(day_of_week__lte=6), name="chk_day_of_week_range"),
            models.CheckConstraint(condition=models.Q(start_hour__lt=models.F("end_hour")), name="chk_start_before_end"),
            models.UniqueConstraint(fields=["therapist", "day_of_week"], name="uniq_therapist_availability_day"),
        ]
