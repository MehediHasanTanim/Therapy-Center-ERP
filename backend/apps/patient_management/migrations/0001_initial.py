import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Patient",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("full_name", models.CharField(max_length=255)),
                ("parent_name", models.CharField(max_length=255)),
                ("spectrum", models.CharField(max_length=128)),
                ("date_of_birth", models.DateField()),
                ("phone", models.CharField(max_length=64)),
                ("address", models.TextField()),
                ("notes", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "patients", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PatientDocument",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("file_name", models.CharField(max_length=255)),
                ("content_type", models.CharField(max_length=128)),
                ("size", models.PositiveIntegerField()),
                ("version", models.PositiveIntegerField()),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="patient_management.patient",
                    ),
                ),
            ],
            options={"db_table": "patient_documents", "ordering": ["version"]},
        ),
        migrations.AddConstraint(
            model_name="patientdocument",
            constraint=models.UniqueConstraint(fields=("patient", "version"), name="uniq_patient_document_version"),
        ),
    ]
