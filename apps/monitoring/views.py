from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
from apps.devices.models import Device
from .models import Heartbeat, Alert
from .serializers import HeartbeatSerializer, AlertSerializer
from .services import handle_first_connection, handle_reconnection, mark_stale_devices_offline

class HeartbeatViewSet(viewsets.ModelViewSet):

    queryset = Heartbeat.objects.all()
    serializer_class = HeartbeatSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def ping(self, request):

        mark_stale_devices_offline()
        agent_token = getattr(settings, "AGENT_TOKEN", None)
        if agent_token and request.headers.get("X-Agent-Token") != agent_token:
            return Response({"error": "Token agent invalide"}, status=401)

        mac = (request.data.get('mac_address') or '').strip().lower()
        name = (request.data.get('name') or '').strip()
        ip = request.data.get('ip_address')
        if ip in ("", "unknown"):
            ip = None
        if not mac:
            return Response({"error": "MAC address requise"},  status=400)

        existing = Device.objects.filter(mac_address=mac).first()
        was_offline = existing and existing.status == "offline"

        device, created = Device.objects.update_or_create(
            mac_address=mac,
            defaults={
                "name": name or mac,
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
