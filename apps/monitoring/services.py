import logging
from datetime import timedelta

from django.utils import timezone
from apps.devices.models import Device
from .models import Alert

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def send_alert_ws(alert):
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        async_to_sync(channel_layer.group_send)(
            "alerts",
            {
                "type": "send_alert",
                "data": {
                    "id": alert.id,
                    "device": alert.device.name,
                    "alert_type": alert.alert_type,
                    "message": alert.message,
                    "created_at": str(alert.created_at),
                },
            },
        )
    except Exception as exc:
        logger.warning("Impossible d'envoyer l'alerte via websocket: %s", exc)


OFFLINE_THRESHOLD_MINUTES = 1

def create_device_alert(device, alert_type, message):
    alert = Alert.objects.create(
        device=device,
        alert_type=alert_type,
        message=message
    )

    send_alert_ws(alert)
    return alert

def mark_stale_devices_offline():
    limit = timezone.now() - timedelta(minutes=OFFLINE_THRESHOLD_MINUTES)

    stale_devices = list(Device.objects.filter(
        last_seen__lt=limit,
        status="online"
    ))

    for device in stale_devices:

        device.status = "offline"
        device.save(update_fields=["status"])
        create_device_alert(
            device=device,
            alert_type="disconnection",
            message=f"{device.name} s'est déconnecté."
        )

    return len(stale_devices)

def handle_first_connection(device):
    create_device_alert(
        device=device,
        alert_type="first_connection",
        message=f"{device.name} s'est connecté pour la première fois."
    )

def handle_reconnection(device):
    create_device_alert(
        device=device,
        alert_type="reconnection",
        message=f"{device.name} s'est reconnecté."
    )
