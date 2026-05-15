import logging
from secrets import compare_digest
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.conf import settings

from apps.devices.models import Device
from .models import InstalledSoftware
from .serializers import SoftwareInventorySerializer, InstalledSoftwareSerializer

logger = logging.getLogger(__name__)


def _normalize_software_names(sw_list):
    seen = set()
    unique_names = []

    for item in sw_list:
        name = item["name"].strip()
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique_names.append(name)

    return unique_names


class SoftwareInventoryView(APIView):
    permission_classes = [AllowAny]
 
    def post(self, request):
        agent_token = getattr(settings, "AGENT_TOKEN", "").strip()
        received_token = request.headers.get("X-Agent-Token", "")
        if not agent_token:
            return Response(
                {"error": "Token agent non configure cote serveur"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        if not compare_digest(received_token, agent_token):
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

        normalized_names = _normalize_software_names(sw_list)
        created_count = 0
        deleted_count = InstalledSoftware.objects.filter(device=device).delete()[0]

        for name in normalized_names:
            InstalledSoftware.objects.create(
              device=device,
              name=name,
            )
            created_count += 1

        logger.info(
            "Inventaire %s (%s) : %d supprimés, %d créés",
            mac, hostname, deleted_count, created_count,
        )
        return Response({
            "status":  "ok",
            "deleted": deleted_count,
            "created": created_count,
            "total":   len(normalized_names),
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
