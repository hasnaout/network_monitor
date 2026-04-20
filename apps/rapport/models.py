from django.db import models
from apps.devices.models import Device

class Report(models.Model):
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    date = models.DateField()
    avg_cpu = models.FloatField(default=0.0)
    avg_ram = models.FloatField(default=0.0)
    avg_latency = models.FloatField(default=0.0)
    uptime_percentage = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report {self.device.name} - {self.date}"

    class Meta:
        ordering = ['-created_at']