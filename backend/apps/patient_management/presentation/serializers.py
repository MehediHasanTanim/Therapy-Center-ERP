from rest_framework import serializers

from apps.patient_management.domain.value_objects import Spectrum


class PatientDocumentReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    patientId = serializers.UUIDField(read_only=True)
    fileName = serializers.CharField(read_only=True)
    contentType = serializers.CharField(read_only=True)
    size = serializers.IntegerField(read_only=True)
    version = serializers.IntegerField(read_only=True)
    uploadedAt = serializers.DateTimeField(read_only=True)
    fileUrl = serializers.CharField(read_only=True, allow_null=True)


class PatientReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    fullName = serializers.CharField(read_only=True)
    parentName = serializers.CharField(read_only=True)
    spectrum = serializers.ChoiceField(choices=Spectrum.values(), read_only=True)
    dateOfBirth = serializers.DateField(read_only=True)
    phone = serializers.CharField(read_only=True)
    address = serializers.CharField(read_only=True)
    notes = serializers.CharField(read_only=True, allow_null=True)
    createdAt = serializers.DateTimeField(read_only=True)
    documents = PatientDocumentReadSerializer(read_only=True, many=True)


class PatientCreateSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=255)
    parentName = serializers.CharField(max_length=255)
    spectrum = serializers.ChoiceField(choices=Spectrum.values())
    dateOfBirth = serializers.DateField()
    phone = serializers.CharField(max_length=64)
    address = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


class PatientUpdateSerializer(PatientCreateSerializer):
    pass


class PatientDocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
