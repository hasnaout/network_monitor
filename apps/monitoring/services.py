from datetime import timedelta

from django.utils import timezone

from apps.devices.models import Device

from .models import Alert


OFFLINE_THRESHOLD_MINUTES = 2


def create_device_alert(device, alert_type, message, severity="info"):
    return Alert.objects.create(
        device=device,
        alert_type=alert_type,
        message=message,
        severity=severity,
    )


def mark_stale_devices_offline():
    limit = timezone.now() - timedelta(minutes=OFFLINE_THRESHOLD_MINUTES)
    stale_devices = Device.objects.filter(last_seen__lt=limit, status="online")

    for device in stale_devices:
        device.status = "offline"
        device.save(update_fields=["status"])
        create_device_alert(
            device=device,
            alert_type="device_disconnected",
            message=f"La machine {device.name} est deconnectee.",
            severity="critical",
        )

    return stale_devices.count()
