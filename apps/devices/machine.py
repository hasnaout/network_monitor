from django.db import models

class Device(models.Model):
    name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField()
    mac_address = models.CharField(max_length=50, null=True, blank=True)

    device_type = models.CharField(max_length=50)  # router, switch, server

    status = models.CharField(
        max_length=20,
        default="offline"
    )

    location = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name