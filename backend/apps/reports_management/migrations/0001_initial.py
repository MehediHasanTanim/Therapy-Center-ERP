from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("user_management", "0001_initial"),
        ("patient_management", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("entity_type", models.CharField(max_length=64)),
                ("entity_id", models.UUIDField()),
                ("action", models.CharField(max_length=64)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("therapist_id", models.UUIDField(blank=True, null=True)),
                ("therapist_name", models.CharField(blank=True, default="", max_length=255)),
                ("session_title", models.CharField(blank=True, default="", max_length=255)),
                ("payment_method", models.CharField(blank=True, default="", max_length=32)),
                ("amount", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to="patient_management.patient")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to="user_management.user")),
            ],
            options={
                "db_table": "audit_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="DocumentActivity",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("document_id", models.UUIDField()),
                ("file_name", models.CharField(max_length=255)),
                ("version", models.PositiveIntegerField()),
                ("action", models.CharField(max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="document_activities", to="patient_management.patient")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="document_activities", to="user_management.user")),
            ],
            options={
                "db_table": "document_activities",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["entity_type", "created_at"], name="idx_audit_entity_created"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["created_at"], name="idx_audit_created_at"),
        ),
        migrations.AddIndex(
            model_name="documentactivity",
            index=models.Index(fields=["patient", "created_at"], name="idx_doc_act_patient_dt"),
        ),
        migrations.AddIndex(
            model_name="documentactivity",
            index=models.Index(fields=["created_at"], name="idx_doc_act_created_dt"),
        ),
    ]
