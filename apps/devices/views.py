from rest_framework import viewsets
from .models import Device
from rest_framework.permissions import IsAdminUser, AllowAny
from .serializers import DeviceSerializer
from apps.monitoring.services import mark_stale_devices_offline

class DeviceViewSet(viewsets.ModelViewSet):
    """
    API complète pour les devices.
    """
    serializer_class = DeviceSerializer

    def get_queryset(self):
        mark_stale_devices_offline()
        return Device.objects.all()
