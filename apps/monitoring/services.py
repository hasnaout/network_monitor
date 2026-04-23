from datetime import timedelta
from django.utils import timezone
from apps.devices.models import Device
from .models import Alert

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_alert_ws(alert):
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        "alerts",
        {
            "type": "send_alert",
            "data": {
                "id": alert.id,
                "device": alert.device.name,
                "message": alert.message,
                "severity": alert.severity,
            },
        }
    )
OFFLINE_THRESHOLD_MINUTES = 1


def create_device_alert(device, alert_type, message, severity="info"):
    return Alert.objects.create(
        device=device,
        alert_type=alert_type,
        message=message,
        severity=severity,
    )


def mark_stale_devices_offline():
    limit = timezone.now() - timedelta(minutes=OFFLINE_THRESHOLD_MINUTES)

    stale_devices = Device.objects.filter(
        last_seen__lt=limit,
        status="online"
    )

    for device in stale_devices:
        device.status = "offline"
        device.save(update_fields=["status"])

        create_device_alert(
            device=device,
            alert_type="device_disconnected",
            message=f"La machine {device.name} est déconnectée.",
            severity="critical",
        )

    return stale_devices.count()