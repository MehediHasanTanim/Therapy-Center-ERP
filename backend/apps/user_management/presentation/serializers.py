from rest_framework import serializers

from apps.user_management.domain.value_objects import UserRole


class UserReadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.ChoiceField(choices=UserRole.values(), read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class UserCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=UserRole.values())
    password = serializers.CharField(write_only=True, min_length=8)


class UserUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=UserRole.values())
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
