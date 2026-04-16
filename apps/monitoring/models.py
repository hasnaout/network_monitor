from django.db import models
from django.db import models
from apps.devices.models import Device
class Alert(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=50)
    message = models.TextField()

    severity = models.CharField(
        max_length=20,
        choices=[
            ("info", "Info"),
            ("warning", "Warning"),
            ("critical", "Critical"),
        ]
    )

    is_resolved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)