import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("user_management", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Employee",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("full_name", models.CharField(max_length=255)),
                ("phone", models.CharField(max_length=64)),
                ("address", models.TextField(blank=True, null=True)),
                ("date_of_birth", models.DateField(blank=True, null=True)),
                ("national_id", models.CharField(blank=True, max_length=128, null=True)),
                ("emergency_contact_name", models.CharField(blank=True, max_length=255, null=True)),
                ("emergency_contact_phone", models.CharField(blank=True, max_length=64, null=True)),
                ("status", models.CharField(max_length=32)),
                ("job_title", models.CharField(max_length=128)),
                ("department", models.CharField(max_length=64)),
                ("employment_type", models.CharField(max_length=64)),
                ("join_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "manager",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reports",
                        to="employee_management.employee",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="employee_profile",
                        to="user_management.user",
                    ),
                ),
            ],
            options={
                "db_table": "employees",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="EmployeeCompensation",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("pay_type", models.CharField(max_length=32)),
                ("base_rate", models.DecimalField(max_digits=12, decimal_places=2)),
                ("currency", models.CharField(default="BDT", max_length=16)),
                ("effective_from", models.DateField()),
                ("effective_to", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="compensations",
                        to="employee_management.employee",
                    ),
                ),
            ],
            options={
                "db_table": "employee_compensations",
                "ordering": ["-effective_from"],
            },
        ),
        migrations.CreateModel(
            name="EmployeeDocument",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("file_name", models.CharField(max_length=255)),
                ("content_type", models.CharField(max_length=128)),
                ("size", models.PositiveIntegerField()),
                ("doc_type", models.CharField(max_length=64)),
                ("file", models.FileField(upload_to="employee_documents/%Y/%m/%d")),
                ("version", models.PositiveIntegerField()),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="employee_management.employee",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="user_management.user",
                    ),
                ),
            ],
            options={
                "db_table": "employee_documents",
                "ordering": ["version"],
            },
        ),
        migrations.AddIndex(
            model_name="employee",
            index=models.Index(fields=["status"], name="idx_employee_status"),
        ),
        migrations.AddIndex(
            model_name="employee",
            index=models.Index(fields=["department"], name="idx_employee_department"),
        ),
        migrations.AddIndex(
            model_name="employee",
            index=models.Index(fields=["employment_type"], name="idx_employee_emp_type"),
        ),
        migrations.AddIndex(
            model_name="employee",
            index=models.Index(fields=["join_date"], name="idx_employee_join_date"),
        ),
        migrations.AddIndex(
            model_name="employee",
            index=models.Index(fields=["manager"], name="idx_employee_manager"),
        ),
        migrations.AddConstraint(
            model_name="employee",
            constraint=models.CheckConstraint(
                condition=models.Q(end_date__isnull=True) | models.Q(end_date__gte=models.F("join_date")),
                name="chk_employee_end_after_join",
            ),
        ),
        migrations.AddConstraint(
            model_name="employeecompensation",
            constraint=models.CheckConstraint(
                condition=models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=models.F("effective_from")),
                name="chk_employee_comp_effective",
            ),
        ),
        migrations.AddConstraint(
            model_name="employeedocument",
            constraint=models.UniqueConstraint(fields=["employee", "version"], name="uniq_employee_document_version"),
        ),
    ]
