from rest_framework import serializers
from .models import Alert

class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    class Meta:
        model = Alert
        fields = '__all__'