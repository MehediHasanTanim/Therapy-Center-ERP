from rest_framework import serializers

from apps.session_management.domain.value_objects import SessionKind, SessionStatus, TherapyType


class SessionReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    patientId = serializers.UUIDField(read_only=True)
    therapistId = serializers.UUIDField(read_only=True)
    therapyType = serializers.ChoiceField(choices=TherapyType.values(), read_only=True)
    title = serializers.CharField(read_only=True)
    startsAt = serializers.DateTimeField(read_only=True)
    endsAt = serializers.DateTimeField(read_only=True)
    status = serializers.ChoiceField(choices=SessionStatus.values(), read_only=True)
    type = serializers.ChoiceField(choices=SessionKind.values(), read_only=True)
    cancellationReason = serializers.CharField(read_only=True, allow_blank=True, required=False)
    noShowReason = serializers.CharField(read_only=True, allow_blank=True, required=False)
    createdAt = serializers.DateTimeField(read_only=True)

class SessionRecurrencePatternSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["daily", "weekly", "monthly"])
    interval = serializers.IntegerField(min_value=1, required=False, default=1)
    daysOfWeek = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False,
        allow_empty=True,
    )
    dayOfMonth = serializers.IntegerField(min_value=1, max_value=31, required=False)
    weekOfMonth = serializers.IntegerField(min_value=-1, max_value=4, required=False)
    dayOfWeek = serializers.IntegerField(min_value=0, max_value=6, required=False)


class SessionRecurrenceRangeSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["noEnd", "endAfter", "endBy"])
    count = serializers.IntegerField(min_value=1, required=False)
    endDate = serializers.DateField(required=False)


class SessionRecurrenceSerializer(serializers.Serializer):
    pattern = SessionRecurrencePatternSerializer()
    range = SessionRecurrenceRangeSerializer()


class SessionCreateSerializer(serializers.Serializer):
    patientId = serializers.UUIDField()
    therapistId = serializers.UUIDField()
    therapyType = serializers.ChoiceField(choices=TherapyType.values(), required=False, default=TherapyType.OTHER.value)
    title = serializers.CharField(max_length=255)
    startsAt = serializers.DateTimeField()
    endsAt = serializers.DateTimeField()
    type = serializers.ChoiceField(choices=SessionKind.values())
    cancellationReason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    noShowReason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    recurrence = SessionRecurrenceSerializer(required=False, allow_null=True)


class SessionRescheduleSerializer(serializers.Serializer):
    startsAt = serializers.DateTimeField()
    endsAt = serializers.DateTimeField()


class SessionStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=SessionStatus.values())
    cancellationReason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    noShowReason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
