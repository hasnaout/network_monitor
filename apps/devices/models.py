from django.db import models

class Device(models.Model):

    STATUS_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
        ("maintenance", "Maintenance"),
    ]

    name = models.CharField(max_length=100)

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    # IDENTIFIANT UNIQUE
    mac_address = models.CharField(
        max_length=50,
        unique=True
    )

    device_type = models.CharField(
        max_length=50,
        default="PC"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="offline"
    )

    last_user = models.CharField(
        max_length=100,
        blank=True,
        default=""
    )

    location = models.CharField(
        max_length=100,
        blank=True,
        default=""
    )

    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.mac_address})"

    class Meta:
        ordering = ['-last_seen']