from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Device
from .serializers import DeviceSerializer
from apps.monitoring.services import mark_stale_devices_offline


class DeviceViewSet(viewsets.ModelViewSet):

    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        mark_stale_devices_offline()
        return Device.objects.all().order_by('-last_seen')