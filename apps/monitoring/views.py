from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.devices.models import Device
from .models import Heartbeat, Alert
from .serializers import HeartbeatSerializer, AlertSerializer
from .services import create_device_alert, mark_stale_devices_offline

class HeartbeatViewSet(viewsets.ModelViewSet):

    queryset = Heartbeat.objects.all()
    serializer_class = HeartbeatSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def ping(self, request):

        mark_stale_devices_offline()
        mac = request.data.get('mac_address')
        name = request.data.get('name')
        ip = request.data.get('ip_address')
        if not mac:
            return Response({"error": "MAC address requise"},  status=400)

        existing = Device.objects.filter(mac_address=mac).first()
        was_offline = existing and existing.status == "offline"

        device, created = Device.objects.update_or_create(
            mac_address=mac,
            defaults={
                "name": name,
                "ip_address": ip,
                "status": "online",
            }
        )

        if created:
          handle_first_connection(device)

        elif was_offline:
           handle_reconnection(device)

        Heartbeat.objects.create(device=device)

        return Response({"status": "ok","device": device.name,}, status=status.HTTP_201_CREATED)

class AlertViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Alert.objects.all()