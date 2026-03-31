from rest_framework import serializers

from apps.therapist_management.domain.value_objects import TherapistSpecialty


class AvailabilityReadSerializer(serializers.Serializer):
    dayOfWeek = serializers.IntegerField(min_value=0, max_value=6, read_only=True)
    startHour = serializers.TimeField(format="%H:%M", read_only=True)
    endHour = serializers.TimeField(format="%H:%M", read_only=True)


class AvailabilityWriteSerializer(serializers.Serializer):
    dayOfWeek = serializers.IntegerField(min_value=0, max_value=6)
    startHour = serializers.TimeField(format="%H:%M", input_formats=["%H:%M"])
    endHour = serializers.TimeField(format="%H:%M", input_formats=["%H:%M"])


class TherapistReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    fullName = serializers.CharField(read_only=True)
    specialty = serializers.ChoiceField(choices=TherapistSpecialty.values(), read_only=True)
    payoutPercentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    createdAt = serializers.DateTimeField(read_only=True)
    availability = AvailabilityReadSerializer(read_only=True, many=True)


class TherapistCreateSerializer(serializers.Serializer):
    fullName = serializers.CharField(max_length=255)
    specialty = serializers.ChoiceField(choices=TherapistSpecialty.values())
    payoutPercentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, min_value=0, max_value=100
    )
    availability = AvailabilityWriteSerializer(many=True)


class TherapistUpdateSerializer(TherapistCreateSerializer):
    pass
