from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Utilisateur personnalisé du système.
    """

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('technician', 'Technician'),
        ('viewer', 'Viewer'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='viewer'
    )

    phone = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"