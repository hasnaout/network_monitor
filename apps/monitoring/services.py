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
            },
        }
    )
OFFLINE_THRESHOLD_MINUTES = 1

def create_device_alert(device, alert_type, message):
  alert = Alert.objects.create(
        device=device,
        alert_type=alert_type,
        message=message,
    )
    send_alert_ws(alert)
    return alert


def mark_stale_devices_offline():
    limit = timezone.now() - timedelta(minutes=OFFLINE_THRESHOLD_MINUTES)

    stale_devices = Device.objects.filter(
        last_seen__lt=limit,
        status="online"
    )

    stale_devices.update(status="offline")

    for device in stale_devices:
        alert = create_device_alert(
            device=device,
            alert_type="device_disconnected",
            message=f"La machine {device.name} est déconnectée.",
        )

        send_alert_ws(alert)

    return stale_devices.count()