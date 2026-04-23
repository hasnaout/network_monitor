from rest_framework import serializers
from .models import Heartbeat, Alert


class HeartbeatSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(
        source='device.name',
        read_only=True
    )

    class Meta:
        model = Heartbeat
        fields = '__all__'


class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(
        source='device.name',
        read_only=True
    )

    class Meta:
        model = Alert
        fields = '__all__'