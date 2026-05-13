from rest_framework import serializers
from .models import AppUsage


class AppUsageItemSerializer(serializers.Serializer):
    """Un enregistrement d'utilisation pour une application."""
    app_name         = serializers.CharField(max_length=255)
    duration_seconds = serializers.IntegerField(min_value=0)
    date             = serializers.DateField()


class AppUsagePayloadSerializer(serializers.Serializer):
    """Payload complet envoyé par l'agent."""
    mac_address = serializers.CharField(max_length=64)
    hostname    = serializers.CharField(max_length=255)
    usages      = AppUsageItemSerializer(many=True)


class AppUsageReadSerializer(serializers.ModelSerializer):
    """Sérialisation pour lecture dashboard."""
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model  = AppUsage
        fields = ["id", "app_name", "date", "duration_seconds", "duration_minutes", "last_updated"]

    def get_duration_minutes(self, obj):
        return round(obj.duration_seconds / 60, 1)
