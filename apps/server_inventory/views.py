import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from heartbeat.models import Device           # ton modèle Device existant
from .models import InstalledSoftware
from .serializers import SoftwareInventorySerializer, InstalledSoftwareSerializer

logger = logging.getLogger(__name__)


class SoftwareInventoryView(APIView):
    """
    POST /api/inventory/software/
    Reçoit l'inventaire complet d'un agent et met à jour la base.

    Stratégie : upsert (update_or_create) pour chaque logiciel.
    Les logiciels absents du dernier envoi ne sont PAS supprimés —
    ils gardent leur last_seen ancienne, ce qui permet de détecter
    les désinstallations côté dashboard.
    """

    def post(self, request):
        serializer = SoftwareInventorySerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Inventaire invalide : %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data       = serializer.validated_data
        mac        = data["mac_address"]
        hostname   = data["hostname"]
        sw_list    = data["software"]

        # Récupérer (ou créer) le Device
        try:
            device = Device.objects.get(mac_address=mac)
        except Device.DoesNotExist:
            logger.warning("Inventaire reçu pour MAC inconnue : %s (%s)", mac, hostname)
            return Response(
                {"detail": "Device non trouvé. Il doit d'abord envoyer un heartbeat."},
                status=status.HTTP_404_NOT_FOUND,
            )

        now = timezone.now()
        created_count = 0
        updated_count = 0

        for item in sw_list:
            _, created = InstalledSoftware.objects.update_or_create(
                device       = device,
                name         = item["name"],
                version      = item["version"],
                defaults={
                    "publisher":    item["publisher"],
                    "install_date": item["install_date"],
                    "last_seen":    now,
                },
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
    """
    GET /api/inventory/software/?mac_address=XX:XX:XX:XX:XX:XX
    Retourne la liste des logiciels connus pour un device (pour le dashboard).
    """

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
