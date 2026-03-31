from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("patient_management", "0001_initial"),
        ("therapist_management", "0002_add_payout_percentage"),
        ("session_management", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="session",
            name="cancellation_reason",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="session",
            name="no_show_reason",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.CreateModel(
            name="SessionConflictLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("therapy_type", models.CharField(max_length=32)),
                ("session_type", models.CharField(max_length=32)),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("action", models.CharField(max_length=32)),
                ("reason", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="session_conflicts", to="patient_management.patient")),
                ("therapist", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="session_conflicts", to="therapist_management.therapist")),
            ],
            options={
                "db_table": "session_conflict_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="sessionconflictlog",
            index=models.Index(fields=["therapist", "created_at"], name="idx_conflict_therapist_created"),
        ),
        migrations.AddIndex(
            model_name="sessionconflictlog",
            index=models.Index(fields=["created_at"], name="idx_conflict_created_at"),
        ),
    ]
