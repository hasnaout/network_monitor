import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.conf import settings

from apps.devices.models import Device
from .models import InstalledSoftware
from .serializers import SoftwareInventorySerializer, InstalledSoftwareSerializer

logger = logging.getLogger(__name__)


class SoftwareInventoryView(APIView):
    permission_classes = [AllowAny]
 
    def post(self, request):
        agent_token = getattr(settings, "AGENT_TOKEN", None)
        if agent_token and request.headers.get("X-Agent-Token") != agent_token:
            return Response({"error": "Token agent invalide"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = SoftwareInventorySerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Inventaire invalide : %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data       = serializer.validated_data
        mac        = data["mac_address"]
        hostname   = data["hostname"]
        sw_list    = data["software"]

        try:
            device = Device.objects.get(mac_address=mac)
        except Device.DoesNotExist:
            logger.warning("Inventaire reçu pour MAC inconnue : %s (%s)", mac, hostname)
            return Response(
                {"detail": "Device non trouvé. Il doit d'abord envoyer un heartbeat."},
                status=status.HTTP_404_NOT_FOUND,
            )

        created_count = 0
        updated_count = 0

        for item in sw_list:
            _, created = InstalledSoftware.objects.update_or_create(
                device       = device,
                name         = item["name"],
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        logger.info(
            "Inventaire %s (%s) : %d créés, %d mis à jour",
            mac, hostname, created_count, updated_count,
        )
        return Response({
            "status":  "ok",
            "created": created_count,
            "updated": updated_count,
            "total":   len(sw_list),
        }, status=status.HTTP_200_OK)


class DeviceSoftwareListView(APIView):
    def get(self, request):
        mac = request.query_params.get("mac_address")
        if not mac:
            return Response(
                {"detail": "Paramètre mac_address requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            device = Device.objects.get(mac_address=mac)
        except Device.DoesNotExist:
            return Response({"detail": "Device non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        software = InstalledSoftware.objects.filter(device=device)
        serializer = InstalledSoftwareSerializer(software, many=True)
        return Response({"mac_address": mac, "count": software.count(), "software": serializer.data})
