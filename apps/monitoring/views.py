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
            return Response(
                {"error": "MAC address requise"},
                status=400
            )

        existing = Device.objects.filter(mac_address=mac).first()
        was_offline = existing and existing.status != "online"

        device, created = Device.objects.update_or_create(
            mac_address=mac,
            defaults={
                "name": name,
                "ip_address": ip,
                "status": "online",
            }
        )

        if created:
            create_device_alert(
                device,
                "device_connected",
                f"{device.name} ajouté",
                "info"
            )

        elif was_offline:
            create_device_alert(
                device,
                "device_reconnected",
                f"{device.name} reconnecté",
                "warning"
            )

        Heartbeat.objects.create(
            device=device
        )

        return Response({
            "status": "ok",
            "device": device.name,
        }, status=status.HTTP_201_CREATED)


class AlertViewSet(viewsets.ModelViewSet):

    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        mark_stale_devices_offline()
        return Alert.objects.all()

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save()
        return Response({"status": "resolved"})

    @action(detail=False, methods=['get'])
    def open(self, request):
        alerts = Alert.objects.filter(is_resolved=False)
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)