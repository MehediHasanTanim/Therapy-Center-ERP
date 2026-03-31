import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("patient_management", "0002_patientdocument_file"),
        ("session_management", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("method", models.CharField(max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payments",
                        to="patient_management.patient",
                    ),
                ),
                (
                    "session",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payments",
                        to="session_management.session",
                    ),
                ),
            ],
            options={"db_table": "payments", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["patient", "created_at"], name="idx_payment_patient_created"),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["session"], name="idx_payment_session"),
        ),
    ]

