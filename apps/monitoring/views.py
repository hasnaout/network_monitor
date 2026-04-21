from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.devices.models import Device
from rest_framework.permissions import IsAdminUser, AllowAny 
from .models import Heartbeat, Alert
from .serializers import HeartbeatSerializer, AlertSerializer

class HeartbeatViewSet(viewsets.ModelViewSet):
    queryset = Heartbeat.objects.all()
    serializer_class = HeartbeatSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'],
      permission_classes=[AllowAny])
    def ping(self, request):
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

        device, created = Device.objects.update_or_create(
            mac_address=mac,
            defaults={
                'name': name,
                'ip_address': ip,
                'last_user': user,
                'status': 'online',
            }
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
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

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