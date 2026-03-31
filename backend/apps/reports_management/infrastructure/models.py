import uuid

from django.conf import settings
from django.db import models

from apps.patient_management.infrastructure.models import Patient


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    entity_type = models.CharField(max_length=64)
    entity_id = models.UUIDField()
    action = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict, blank=True)
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    therapist_id = models.UUIDField(null=True, blank=True)
    therapist_name = models.CharField(max_length=255, blank=True, default="")
    session_title = models.CharField(max_length=255, blank=True, default="")
    payment_method = models.CharField(max_length=32, blank=True, default="")
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "created_at"], name="idx_audit_entity_created"),
            models.Index(fields=["created_at"], name="idx_audit_created_at"),
        ]


class DocumentActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="document_activities")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="document_activities")
    document_id = models.UUIDField()
    file_name = models.CharField(max_length=255)
    version = models.PositiveIntegerField()
    action = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"], name="idx_doc_act_patient_dt"),
            models.Index(fields=["created_at"], name="idx_doc_act_created_dt"),
        ]
