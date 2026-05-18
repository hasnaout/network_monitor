from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from apps.devices.models import Device
from .models import USBAlert, USBDevice, USBHistory, USBPolicy
from .serializers import USBAlertSerializer, USBDeviceSerializer, USBHistorySerializer, USBPolicySerializer
from .services import get_usb_statistics, process_usb_snapshot


class USBDeviceViewSet(viewsets.ModelViewSet):
    queryset = USBDevice.objects.select_related("device").all()
    serializer_class = USBDeviceSerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def by_device(self, request):
        device_id = request.query_params.get("device_id")
        qs = self.queryset.filter(device_id=device_id) if device_id else self.queryset.none()
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def trust(self, request, pk=None):
        usb_device = self.get_object()
        usb_device.is_trusted = True
        usb_device.save(update_fields=["is_trusted"])
        return Response(self.get_serializer(usb_device).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def untrust(self, request, pk=None):
        usb_device = self.get_object()
        usb_device.is_trusted = False
        usb_device.save(update_fields=["is_trusted"])
        return Response(self.get_serializer(usb_device).data)

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def report_detection(self, request):
        expected_token = getattr(settings, "AGENT_TOKEN", "").strip()
        received_token = request.headers.get("X-Agent-Token", "").strip()
        if expected_token and received_token != expected_token:
            return Response({"error": "invalid agent token"}, status=status.HTTP_401_UNAUTHORIZED)

        mac_address = str(request.data.get("mac_address") or "").strip().lower()
        usb_devices = request.data.get("usb_devices", [])
        if not mac_address:
            return Response({"error": "mac_address is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(usb_devices, list):
            return Response({"error": "usb_devices must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            device = Device.objects.get(mac_address=mac_address)
        except Device.DoesNotExist:
            return Response({"error": "device not found", "mac_address": mac_address}, status=status.HTTP_404_NOT_FOUND)

        result = process_usb_snapshot(device, usb_devices)
        return Response({"status": "success", "device_id": device.id, **result})


class USBPolicyViewSet(viewsets.ModelViewSet):
    queryset = USBPolicy.objects.select_related("device").all()
    serializer_class = USBPolicySerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def by_device(self, request):
        device_id = request.query_params.get("device_id")
        if not device_id:
            return Response({"error": "device_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        policy, _ = USBPolicy.objects.get_or_create(device_id=device_id)
        return Response(self.get_serializer(policy).data)


class USBHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = USBHistory.objects.select_related("device", "usb_device").all()
    serializer_class = USBHistorySerializer

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def by_device(self, request):
        device_id = request.query_params.get("device_id")
        qs = self.queryset.filter(device_id=device_id) if device_id else self.queryset.none()
        return Response(self.get_serializer(qs[:200], many=True).data)


class USBAlertViewSet(viewsets.ModelViewSet):
    queryset = USBAlert.objects.select_related("device", "usb_device").all()
    serializer_class = USBAlertSerializer

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_as_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=["is_read"])
        return Response(self.get_serializer(alert).data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def statistics(self, request):
        device_id = request.query_params.get("device_id")
        if not device_id:
            return Response({"error": "device_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return Response({"error": "device not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(get_usb_statistics(device))
