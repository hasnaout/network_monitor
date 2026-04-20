from rest_framework import serializers
from .models import Report

class ReportSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    class Meta:
        model = Report
        fields = '__all__'