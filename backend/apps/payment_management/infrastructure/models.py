import uuid

from django.db import models

from apps.patient_management.infrastructure.models import Patient
from apps.session_management.infrastructure.models import Session


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="payments")
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"], name="idx_payment_patient_created"),
            models.Index(fields=["session"], name="idx_payment_session"),
        ]

