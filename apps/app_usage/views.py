import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.devices.models import Device
from .models import AppUsage
from .serializers import AppUsagePayloadSerializer, AppUsageReadSerializer

logger = logging.getLogger(__name__)


class AppUsageIngestView(APIView):
    """
    POST /api/usage/apps/
    Reçoit les données d'utilisation accumulées par l'agent.

    Stratégie : update_or_create avec F() pour incrémenter atomiquement
    la durée si l'app existe déjà pour ce jour — safe en multi-agents.
    """

    def post(self, request):
        serializer = AppUsagePayloadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Payload AppUsage invalide : %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data    = serializer.validated_data
        mac     = data["mac_address"]
        usages  = data["usages"]

        try:
            device = Device.objects.get(mac_address=mac)
        except Device.DoesNotExist:
            logger.warning("AppUsage reçu pour MAC inconnue : %s", mac)
            return Response(
                {"detail": "Device non trouvé. Heartbeat requis d'abord."},
                status=status.HTTP_404_NOT_FOUND,
            )

        created_count  = 0
        updated_count  = 0

        for item in usages:
            if item["duration_seconds"] == 0:
                continue  # ignorer les apps avec 0 seconde

            obj, created = AppUsage.objects.get_or_create(
                device   = device,
                app_name = item["app_name"],
                date     = item["date"],
                defaults = {"duration_seconds": item["duration_seconds"]},
            )

            if not created:
                # Incrémenter la durée existante
                obj.duration_seconds += item["duration_seconds"]
                obj.save(update_fields=["duration_seconds", "last_updated"])
                updated_count += 1
            else:
                created_count += 1

        logger.info(
            "AppUsage %s : %d créés, %d incrémentés sur %d entrées",
            mac, created_count, updated_count, len(usages),
        )
        return Response({
            "status":  "ok",
            "created": created_count,
            "updated": updated_count,
        }, status=status.HTTP_200_OK)


class AppUsageListView(APIView):
    """
    GET /api/usage/apps/?mac_address=XX&date=YYYY-MM-DD
    Retourne les usages d'un device pour une date donnée (dashboard).
    """

    def get(self, request):
        mac  = request.query_params.get("mac_address")
        date = request.query_params.get("date", str(timezone.localdate()))

        if not mac:
            return Response({"detail": "Paramètre mac_address requis."}, status=400)

        try:
            device = Device.objects.get(mac_address=mac)
        except Device.DoesNotExist:
            return Response({"detail": "Device non trouvé."}, status=404)

        usages = AppUsage.objects.filter(device=device, date=date).order_by("-duration_seconds")
        serializer = AppUsageReadSerializer(usages, many=True)
        return Response({
            "mac_address": mac,
            "date":        date,
            "count":       usages.count(),
            "usages":      serializer.data,
        })
