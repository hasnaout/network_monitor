from django.db import models

class Device(models.Model):
    name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(null=True, blank=True) # Peut changer, donc pas unique
    
    # CRITIQUE : L'adresse MAC doit être unique pour identifier le PC sans erreur
    mac_address = models.CharField(max_length=50, unique=True) 
    
    device_type = models.CharField(max_length=50, default="PC")
    status = models.CharField(max_length=20, default="offline")
    
    # Pour stocker l'utilisateur envoyé par le service Windows
    last_user = models.CharField(max_length=100, null=True, blank=True)
    
    location = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.mac_address})"