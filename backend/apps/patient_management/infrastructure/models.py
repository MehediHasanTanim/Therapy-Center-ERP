import uuid

from django.db import models


class Patient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    parent_name = models.CharField(max_length=255)
    spectrum = models.CharField(max_length=128)
    date_of_birth = models.DateField()
    phone = models.CharField(max_length=64)
    address = models.TextField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patients"
        ordering = ["-created_at"]


class PatientDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="documents")
    file_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128)
    size = models.PositiveIntegerField()
    file = models.FileField(upload_to="patient_documents/%Y/%m/%d")
    version = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "patient_documents"
        ordering = ["version"]
        constraints = [
            models.UniqueConstraint(fields=["patient", "version"], name="uniq_patient_document_version"),
        ]
