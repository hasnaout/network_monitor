from rest_framework import serializers
from .models import USBAlert, USBDevice, USBHistory, USBPolicy


class USBDeviceSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    size_gb = serializers.SerializerMethodField()

    class Meta:
        model = USBDevice
        fields = [
            "id", "device", "device_name", "serial_number", "name", "vendor", "product",
            "size_bytes", "size_gb", "mount_point", "status", "is_trusted",
            "first_detected", "last_connected", "last_disconnected",
        ]
        read_only_fields = ["first_detected", "last_connected", "last_disconnected"]

    def get_size_gb(self, obj):
        return round(obj.size_bytes / (1024 ** 3), 2) if obj.size_bytes else None


class USBPolicySerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = USBPolicy
        fields = [
            "id", "device", "device_name", "default_policy", "allow_unknown_devices",
            "max_device_size_gb", "block_auto_run", "created_at", "updated_at",
        ]


class USBHistorySerializer(serializers.ModelSerializer):
    usb_device_name = serializers.CharField(source="usb_device.name", read_only=True)
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = USBHistory
        fields = [
            "id", "usb_device", "usb_device_name", "device", "device_name",
            "event_type", "details", "user_info", "created_at",
        ]


class USBAlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    usb_device_name = serializers.CharField(source="usb_device.name", read_only=True)

    class Meta:
        model = USBAlert
        fields = [
            "id", "device", "device_name", "usb_device", "usb_device_name",
            "message", "severity", "is_read", "created_at",
        ]
