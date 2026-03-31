import uuid

from django.db import models

from apps.user_management.infrastructure.models import User


class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employee_profile")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=64)
    address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    national_id = models.CharField(max_length=128, blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=64, blank=True, null=True)
    status = models.CharField(max_length=32)
    job_title = models.CharField(max_length=128)
    department = models.CharField(max_length=64)
    employment_type = models.CharField(max_length=64)
    join_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    manager = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="reports")
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employees"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"], name="idx_employee_status"),
            models.Index(fields=["department"], name="idx_employee_department"),
            models.Index(fields=["employment_type"], name="idx_employee_emp_type"),
            models.Index(fields=["join_date"], name="idx_employee_join_date"),
            models.Index(fields=["manager"], name="idx_employee_manager"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__isnull=True) | models.Q(end_date__gte=models.F("join_date")),
                name="chk_employee_end_after_join",
            )
        ]


class EmployeeCompensation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="compensations")
    pay_type = models.CharField(max_length=32)
    base_rate = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=16, default="BDT")
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_compensations"
        ordering = ["-effective_from"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=models.F("effective_from")),
                name="chk_employee_comp_effective",
            )
        ]


class EmployeeDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents")
    file_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128)
    size = models.PositiveIntegerField()
    doc_type = models.CharField(max_length=64)
    file = models.FileField(upload_to="employee_documents/%Y/%m/%d")
    version = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_documents"
        ordering = ["version"]
        constraints = [
            models.UniqueConstraint(fields=["employee", "version"], name="uniq_employee_document_version"),
        ]
