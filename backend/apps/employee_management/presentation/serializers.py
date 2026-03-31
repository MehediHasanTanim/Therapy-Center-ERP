from rest_framework import serializers

from apps.employee_management.domain.value_objects import Department, EmploymentStatus, EmploymentType, PayType
from apps.user_management.domain.value_objects import UserRole


class EmployeeDocumentReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    employeeId = serializers.UUIDField(read_only=True)
    fileName = serializers.CharField(read_only=True)
    contentType = serializers.CharField(read_only=True)
    size = serializers.IntegerField(read_only=True)
    docType = serializers.CharField(read_only=True)
    version = serializers.IntegerField(read_only=True)
    uploadedAt = serializers.DateTimeField(read_only=True)
    fileUrl = serializers.CharField(read_only=True, allow_blank=True, required=False)


class EmployeeCompensationSerializer(serializers.Serializer):
    payType = serializers.ChoiceField(choices=PayType.values())
    baseRate = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(required=False, allow_blank=True, default="BDT")
    effectiveFrom = serializers.DateField(required=False)
    effectiveTo = serializers.DateField(required=False, allow_null=True)


class EmployeeReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    userId = serializers.UUIDField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.ChoiceField(choices=UserRole.values(), read_only=True)
    fullName = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    address = serializers.CharField(read_only=True, allow_blank=True)
    dateOfBirth = serializers.DateField(read_only=True, allow_null=True)
    nationalId = serializers.CharField(read_only=True, allow_blank=True)
    emergencyContactName = serializers.CharField(read_only=True, allow_blank=True)
    emergencyContactPhone = serializers.CharField(read_only=True, allow_blank=True)
    status = serializers.ChoiceField(choices=EmploymentStatus.values(), read_only=True)
    jobTitle = serializers.CharField(read_only=True)
    department = serializers.ChoiceField(choices=Department.values(), read_only=True)
    employmentType = serializers.ChoiceField(choices=EmploymentType.values(), read_only=True)
    joinDate = serializers.DateField(read_only=True)
    endDate = serializers.DateField(read_only=True, allow_null=True)
    managerId = serializers.UUIDField(read_only=True, allow_null=True)
    notes = serializers.CharField(read_only=True, allow_blank=True)
    createdAt = serializers.DateTimeField(read_only=True)
    compensation = EmployeeCompensationSerializer(read_only=True, allow_null=True)
    documents = EmployeeDocumentReadSerializer(read_only=True, many=True)


class EmployeeCreateSerializer(serializers.Serializer):
    userId = serializers.UUIDField()
    fullName = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=64)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    dateOfBirth = serializers.DateField(required=False, allow_null=True)
    nationalId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    emergencyContactName = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    emergencyContactPhone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(choices=EmploymentStatus.values())
    jobTitle = serializers.CharField(max_length=128)
    department = serializers.ChoiceField(choices=Department.values())
    employmentType = serializers.ChoiceField(choices=EmploymentType.values())
    joinDate = serializers.DateField()
    endDate = serializers.DateField(required=False, allow_null=True)
    managerId = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    role = serializers.ChoiceField(choices=UserRole.values(), required=False, allow_null=True)
    compensation = EmployeeCompensationSerializer(required=False, allow_null=True)


class EmployeeUpdateSerializer(EmployeeCreateSerializer):
    pass


class EmployeeDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    docType = serializers.CharField(max_length=64)
