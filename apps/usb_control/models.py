from django.db import models
from apps.devices.models import Device


class USBDevice(models.Model):
    STATUS_CONNECTED = "connected"
    STATUS_DISCONNECTED = "disconnected"
    STATUS_CHOICES = [
        (STATUS_CONNECTED, "Connected"),
        (STATUS_DISCONNECTED, "Disconnected"),
        ("blocked", "Blocked"),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="usb_devices")
    serial_number = models.CharField(max_length=255)
    name = models.CharField(max_length=255, default="USB Device")
    vendor = models.CharField(max_length=255, blank=True)
    product = models.CharField(max_length=255, blank=True)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    mount_point = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_CONNECTED)
    is_trusted = models.BooleanField(default=False)
    first_detected = models.DateTimeField(auto_now_add=True)
    last_connected = models.DateTimeField(null=True, blank=True)
    last_disconnected = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("device", "serial_number")
        ordering = ["-last_connected", "name"]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class USBPolicy(models.Model):
    POLICY_MONITOR = "monitor"
    POLICY_BLOCK = "block"
    POLICY_ALLOW = "allow"
    POLICY_CHOICES = [
        (POLICY_MONITOR, "Monitor only"),
        (POLICY_BLOCK, "Block unknown"),
        (POLICY_ALLOW, "Allow"),
    ]

    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name="usb_policy")
    default_policy = models.CharField(max_length=20, choices=POLICY_CHOICES, default=POLICY_MONITOR)
    allow_unknown_devices = models.BooleanField(default=True)
    max_device_size_gb = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"USB policy for {self.device}"


class USBHistory(models.Model):
    EVENT_CONNECTED = "connected"
    EVENT_DISCONNECTED = "disconnected"
    EVENT_SEEN = "seen"
    EVENT_TRUSTED = "trusted"
    EVENT_UNTRUSTED = "untrusted"
    EVENT_TYPES = [
        (EVENT_CONNECTED, "Connected"),
        (EVENT_DISCONNECTED, "Disconnected"),
        (EVENT_SEEN, "Seen"),
        (EVENT_TRUSTED, "Trusted"),
        (EVENT_UNTRUSTED, "Untrusted"),
    ]

    usb_device = models.ForeignKey(USBDevice, on_delete=models.CASCADE, related_name="history")
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="usb_history")
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    details = models.JSONField(default=dict, blank=True)
    user_info = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class USBAlert(models.Model):
    SEVERITY_LOW = "low"
    SEVERITY_MEDIUM = "medium"
    SEVERITY_HIGH = "high"
    SEVERITY_CHOICES = [
        (SEVERITY_LOW, "Low"),
        (SEVERITY_MEDIUM, "Medium"),
        (SEVERITY_HIGH, "High"),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="usb_alerts")
    usb_device = models.ForeignKey(USBDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name="alerts")
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
