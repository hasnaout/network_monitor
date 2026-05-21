from datetime import datetime, time, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.conf import settings
from secrets import compare_digest
from apps.devices.models import Device
from .models import Heartbeat, Alert
from .serializers import HeartbeatSerializer, AlertSerializer
from .services import handle_first_connection, handle_reconnection, mark_stale_devices_offline


def _clean_session_user(value):
    value = (value or "").strip()
    username = value.rsplit("\\", 1)[-1].strip()
    invalid_names = {"system", "localsystem", "localservice", "networkservice", "defaultuser0"}
    if not username or username.lower() in invalid_names or username.endswith("$"):
        return ""
    return username


class HeartbeatViewSet(viewsets.ModelViewSet):

    queryset = Heartbeat.objects.all()
    serializer_class = HeartbeatSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def ping(self, request):

        mark_stale_devices_offline()
        agent_token = getattr(settings, "AGENT_TOKEN", "").strip()
        received_token = request.headers.get("X-Agent-Token", "")
        if not agent_token:
            return Response({"error": "Token agent non configure cote serveur"}, status=500)
        if not compare_digest(received_token, agent_token):
            return Response({"error": "Token agent invalide"}, status=401)

        mac = (request.data.get('mac_address') or '').strip().lower()
        hostname = (request.data.get('name') or '').strip()
        session_user = _clean_session_user(request.data.get('session_user'))
        ip = request.data.get('ip_address')
        if ip in ("", "unknown"):
            ip = None
        if not mac:
            return Response({"error": "MAC address requise"},  status=400)

        existing = Device.objects.filter(mac_address=mac).first()
        was_offline = existing and existing.status == "offline"
        device_name = session_user or hostname or mac

        device, created = Device.objects.update_or_create(
            mac_address=mac,
            defaults={
                "name": device_name,
                "hostname": hostname,
                "ip_address": ip,
                "status": "online",
                "current_user": session_user,
            }
        )

        if not created:
            updated_fields = []
            if session_user and device.name != session_user:
                device.name = session_user
                updated_fields.append('name')
            if session_user and device.current_user != session_user:
                device.current_user = session_user
                updated_fields.append('current_user')
            elif not session_user and hostname and device.name != hostname:
                device.name = hostname
                updated_fields.append('name')
            if hostname and device.hostname != hostname:
                device.hostname = hostname
                updated_fields.append('hostname')
            if updated_fields:
                device.save(update_fields=updated_fields)

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
        qs = Alert.objects.select_related("device").all()
        device_id = self.request.query_params.get("device_id")
        mac = self.request.query_params.get("mac_address")
        date_param = self.request.query_params.get("date")

        if device_id:
            qs = qs.filter(device_id=device_id)
        if mac:
            qs = qs.filter(device__mac_address=mac)
        if date_param:
            selected_date = parse_date(date_param)
            if not selected_date:
                return Alert.objects.none()
            start = timezone.make_aware(
                datetime.combine(selected_date, time.min),
                timezone.get_current_timezone(),
            )
            end = start + timedelta(days=1)
            qs = qs.filter(created_at__gte=start, created_at__lt=end)

        return qs
