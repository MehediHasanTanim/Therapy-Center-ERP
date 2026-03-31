import uuid

from django.db import models

from apps.patient_management.infrastructure.models import Patient
from apps.therapist_management.infrastructure.models import Therapist


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="sessions")
    therapist = models.ForeignKey(Therapist, on_delete=models.CASCADE, related_name="sessions")
    therapy_type = models.CharField(max_length=32)
    title = models.CharField(max_length=255)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=32)
    type = models.CharField(max_length=32)
    cancellation_reason = models.CharField(max_length=255, blank=True, null=True)
    no_show_reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sessions"
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["therapist", "starts_at"], name="idx_session_therapist_start"),
            models.Index(fields=["patient", "starts_at"], name="idx_session_patient_start"),
            models.Index(fields=["status"], name="idx_session_status"),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(starts_at__lt=models.F("ends_at")), name="chk_session_starts_before_ends"),
        ]


class SessionConflictLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="session_conflicts")
    therapist = models.ForeignKey(Therapist, on_delete=models.CASCADE, related_name="session_conflicts")
    therapy_type = models.CharField(max_length=32)
    session_type = models.CharField(max_length=32)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    action = models.CharField(max_length=32)
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "session_conflict_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["therapist", "created_at"], name="idx_conflict_therapist_created"),
            models.Index(fields=["created_at"], name="idx_conflict_created_at"),
        ]
