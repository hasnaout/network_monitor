from django.db import transaction
from django.utils import timezone
from apps.devices.models import Device
from .models import USBAlert, USBDevice, USBHistory, USBPolicy


def normalize_usb_item(item: dict) -> dict | None:
    serial = str(item.get("device_id") or item.get("serial_number") or "").strip()
    mount_point = str(item.get("mount_point") or "").strip()
    if not serial and mount_point:
        serial = f"mount:{mount_point}"
    if not serial:
        return None

    return {
        "serial_number": serial[:255],
        "name": str(item.get("name") or "USB Device")[:255],
        "vendor": str(item.get("vendor") or "")[:255],
        "product": str(item.get("product") or "")[:255],
        "size_bytes": item.get("size_bytes"),
        "mount_point": mount_point[:50],
    }


@transaction.atomic
def process_usb_snapshot(device: Device, usb_devices: list[dict]) -> dict:
    now = timezone.now()
    policy, _ = USBPolicy.objects.get_or_create(device=device)
    normalized = [item for item in (normalize_usb_item(raw) for raw in usb_devices) if item]
    connected_serials = set()
    connected_count = 0
    new_count = 0
    disconnected_count = 0

    for item in normalized:
        serial = item["serial_number"]
        connected_serials.add(serial)
        usb_device, created = USBDevice.objects.get_or_create(
            device=device,
            serial_number=serial,
            defaults={
                "name": item["name"],
                "vendor": item["vendor"],
                "product": item["product"],
                "size_bytes": item["size_bytes"],
                "mount_point": item["mount_point"],
                "status": USBDevice.STATUS_CONNECTED,
                "last_connected": now,
            },
        )

        was_disconnected = usb_device.status != USBDevice.STATUS_CONNECTED
        usb_device.name = item["name"]
        usb_device.vendor = item["vendor"]
        usb_device.product = item["product"]
        usb_device.size_bytes = item["size_bytes"]
        usb_device.mount_point = item["mount_point"]
        usb_device.status = USBDevice.STATUS_CONNECTED
        usb_device.last_connected = now
        usb_device.save(update_fields=[
            "name", "vendor", "product", "size_bytes", "mount_point", "status", "last_connected"
        ])

        event_type = USBHistory.EVENT_CONNECTED if created or was_disconnected else USBHistory.EVENT_SEEN
        USBHistory.objects.create(usb_device=usb_device, device=device, event_type=event_type, details=item)

        connected_count += 1
        if created:
            new_count += 1
            severity = USBAlert.SEVERITY_HIGH if not policy.allow_unknown_devices else USBAlert.SEVERITY_MEDIUM
            USBAlert.objects.create(
                device=device,
                usb_device=usb_device,
                severity=severity,
                message=f"New USB device detected: {usb_device.name} ({usb_device.mount_point})",
            )

    disconnected_qs = USBDevice.objects.filter(
        device=device,
        status=USBDevice.STATUS_CONNECTED,
    ).exclude(serial_number__in=connected_serials)

    for usb_device in disconnected_qs:
        usb_device.status = USBDevice.STATUS_DISCONNECTED
        usb_device.last_disconnected = now
        usb_device.save(update_fields=["status", "last_disconnected"])
        USBHistory.objects.create(
            usb_device=usb_device,
            device=device,
            event_type=USBHistory.EVENT_DISCONNECTED,
        )
        disconnected_count += 1

    return {
        "connected": connected_count,
        "new": new_count,
        "disconnected": disconnected_count,
    }


def get_usb_statistics(device: Device) -> dict:
    qs = USBDevice.objects.filter(device=device)
    return {
        "total": qs.count(),
        "connected": qs.filter(status=USBDevice.STATUS_CONNECTED).count(),
        "disconnected": qs.filter(status=USBDevice.STATUS_DISCONNECTED).count(),
        "trusted": qs.filter(is_trusted=True).count(),
        "untrusted": qs.filter(is_trusted=False).count(),
        "alerts_unread": USBAlert.objects.filter(device=device, is_read=False).count(),
    }
