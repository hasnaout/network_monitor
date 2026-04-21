from rest_framework import viewsets
from django.utils import timezone
from datetime import timedelta
from .models import Device
from rest_framework.permissions import IsAdminUser, AllowAny
from .serializers import DeviceSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    """
    API complète pour les devices.
    """
    serializer_class = DeviceSerializer

    def get_queryset(self):
        # --- LOGIQUE DE MISE À JOUR ---
        # On définit le seuil de 2 minutes
        limit = timezone.now() - timedelta(minutes=2)
        
        # On met à jour les devices qui n'ont pas donné de signe de vie
        Device.objects.filter(last_seen__lt=limit, status='online').update(status='offline')
        
        # --- RETOUR DU QUERYSET ---
        # On retourne la liste mise à jour à l'administrateur
        return Device.objects.all()