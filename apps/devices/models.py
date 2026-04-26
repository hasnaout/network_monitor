from django.db import models
from django.core.validators import RegexValidator
class Device(models.Model):

    STATUS_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
    ]

    name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(null=True,blank=True)
    mac_address = models.CharField(max_length=17,unique=True, validators=[
        RegexValidator(
            regex=r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$',
            message="Adresse MAC invalide"
        )
    ])
    device_type = models.CharField(  max_length=50,  default="PC")
    status = models.CharField(  max_length=20,  choices=STATUS_CHOICES,  default="offline")
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"{self.name} ({self.mac_address})"
    class Meta:
        ordering = ['-last_seen']