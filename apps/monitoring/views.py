from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.devices.models import Device
from .models import Heartbeat, Alert
from .serializers import HeartbeatSerializer, AlertSerializer
from .services import create_device_alert, mark_stale_devices_offline

class HeartbeatViewSet(viewsets.ModelViewSet):
    queryset = Heartbeat.objects.all()
    serializer_class = HeartbeatSerializer

    @action(detail=False, methods=['post'])
    def ping(self, request):
        mark_stale_devices_offline()

        mac = request.data.get('mac_address')
        name = request.data.get('name')
        ip = request.data.get('ip_address')
        user = request.data.get('connected_user')
        cpu = request.data.get('cpu_usage', 0.0)
        ram = request.data.get('ram_usage', 0.0)

        if not mac:
            return Response(
                {"error": "MAC address requise"},
                status=400
            )

        existing_device = Device.objects.filter(mac_address=mac).first()
        was_offline = existing_device is not None and existing_device.status != 'online'

        device, created = Device.objects.update_or_create(
            mac_address=mac,
            defaults={
                'name': name,
                'ip_address': ip,
                'last_user': user,
                'status': 'online',
            }
        )

        if created:
            create_device_alert(
                device=device,
                alert_type='device_connected',
                message=f"La machine {device.name} a ete detectee et ajoutee.",
                severity='info',
            )
        elif was_offline:
            create_device_alert(
                device=device,
                alert_type='device_reconnected',
                message=f"La machine {device.name} est reconnectee.",
                severity='warning',
            )

        Heartbeat.objects.create(
            device=device,
            is_alive=True,
            cpu_usage=cpu,
            ram_usage=ram,
        )

        return Response({
            "status": "Signal reçu",
            "device": device.name,
            "created": created
        }, status=status.HTTP_201_CREATED)


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer

    def get_queryset(self):
        mark_stale_devices_offline()
        return Alert.objects.all()

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save()
        return Response({"status": "Alerte résolue"})

    @action(detail=False, methods=['get'])
    def open(self, request):
        alerts = Alert.objects.filter(is_resolved=False)
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
