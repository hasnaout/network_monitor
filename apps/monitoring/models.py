from django.db import models
from apps.devices.models import Device


class Heartbeat(models.Model):
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='heartbeats'
    )

    is_alive = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    response_time_ms = models.IntegerField(null=True, blank=True)
    cpu_usage = models.FloatField(default=0.0)
    ram_usage = models.FloatField(default=0.0)

    def __str__(self):
        return f"{self.device.name} - {'alive' if self.is_alive else 'dead'}"

    class Meta:
        ordering = ['-timestamp']


class Alert(models.Model):

    SEVERITY_CHOICES = [
        ("info", "Info"),
        ("warning", "Warning"),
        ("critical", "Critical"),
    ]

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='alerts'
    )

    alert_type = models.CharField(max_length=50)

    message = models.TextField()

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES
    )

    is_resolved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.severity}] {self.device.name}"

    class Meta:
        ordering = ['-created_at']