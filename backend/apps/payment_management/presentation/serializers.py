from rest_framework import serializers

from apps.payment_management.domain.value_objects import PaymentMethod


class PaymentReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    patientId = serializers.UUIDField(read_only=True)
    sessionId = serializers.UUIDField(read_only=True, allow_null=True)
    amount = serializers.FloatField(read_only=True)
    method = serializers.ChoiceField(choices=PaymentMethod.values(), read_only=True)
    createdAt = serializers.DateTimeField(read_only=True)


class PaymentCreateSerializer(serializers.Serializer):
    patientId = serializers.UUIDField()
    sessionId = serializers.UUIDField(required=False, allow_null=True)
    amount = serializers.FloatField(min_value=0.01)
    method = serializers.ChoiceField(choices=PaymentMethod.values())

