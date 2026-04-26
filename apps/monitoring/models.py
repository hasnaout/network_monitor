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

    def __str__(self):
        return f"{self.device.name} - {'alive' if self.is_alive else 'dead'}"

    class Meta:
        ordering = ['-timestamp']


class Alert(models.Model):

    ALERT_TYPES = [
        ("first_connection", "Premiere connexion"),
        ("reconnection", "Reconnexion"),
        ("disconnection", "Deconnexion"),
    ]

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='alerts'
    )


    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
      return f"{self.device.name} - {self.alert_type}"

    class Meta:
        ordering = ['-created_at']