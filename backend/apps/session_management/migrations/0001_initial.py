import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("patient_management", "0002_patientdocument_file"),
        ("therapist_management", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Session",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("therapy_type", models.CharField(max_length=32)),
                ("title", models.CharField(max_length=255)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("status", models.CharField(max_length=32)),
                ("type", models.CharField(max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="patient_management.patient",
                    ),
                ),
                (
                    "therapist",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="therapist_management.therapist",
                    ),
                ),
            ],
            options={"db_table": "sessions", "ordering": ["starts_at"]},
        ),
        migrations.AddIndex(
            model_name="session",
            index=models.Index(fields=["therapist", "starts_at"], name="idx_session_therapist_start"),
        ),
        migrations.AddIndex(
            model_name="session",
            index=models.Index(fields=["patient", "starts_at"], name="idx_session_patient_start"),
        ),
        migrations.AddIndex(
            model_name="session",
            index=models.Index(fields=["status"], name="idx_session_status"),
        ),
        migrations.AddConstraint(
            model_name="session",
            constraint=models.CheckConstraint(
                condition=models.Q(("starts_at__lt", models.F("ends_at"))),
                name="chk_session_starts_before_ends",
            ),
        ),
    ]

