from django.db import models
from devices.models import Device

class Report(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)

    date = models.DateField()

    avg_cpu = models.FloatField()
    avg_ram = models.FloatField()
    avg_latency = models.FloatField()

    uptime_percentage = models.FloatField()