import logging
from secrets import compare_digest
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework import status

from apps.devices.models import Device
from .models import RemoteCommand
from .serializers import (
    CreateCommandSerializer,
    CommandResultSerializer,
    RemoteCommandSerializer,
)

logger = logging.getLogger(__name__)


def _verify_agent_token(request) -> bool:
    """
    Vérifie le token de l'agent dans le header X-Agent-Token.
    Si AGENT_TOKEN n'est pas défini dans settings → accès refusé.
    """
    expected = getattr(settings, "AGENT_TOKEN", None)
    if not expected:
        logger.error("AGENT_TOKEN non configuré dans settings.py")
        return False
    received = request.headers.get("X-Agent-Token", "")
    return compare_digest(received, expected)


class CreateCommandView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = CreateCommandSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        mac     = serializer.validated_data.get("mac_address", "").strip().lower()
        command = serializer.validated_data["command"]
        shell   = serializer.validated_data.get("shell", "cmd")
        timeout = serializer.validated_data.get("timeout", 30)

        device = None
        if mac:
            try:
                device = Device.objects.get(mac_address=mac)
            except Device.DoesNotExist:
                return Response(
                    {"detail": f"Aucun agent trouvé avec la MAC {mac}."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        if device:
            cmd = RemoteCommand.objects.create(
                device=device,
                command=command,
                shell=shell,
                timeout=timeout,
                created_by=request.user,
                status=RemoteCommand.Status.PENDING,
            )
            created_ids = [cmd.id]
        else:
            devices = Device.objects.filter(status="online")
            if not devices.exists():
                return Response(
                    {"detail": "Aucun agent actif trouvé pour le broadcast."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            cmds = RemoteCommand.objects.bulk_create([
                RemoteCommand(
                    device=d,
                    command=command,
                    shell=shell,
                    timeout=timeout,
                    created_by=request.user,
                    status=RemoteCommand.Status.PENDING,
                )
                for d in devices
            ])
            created_ids = [c.id for c in cmds]

        logger.info(
            "Admin %s a créé %d commande(s) (shell=%s, timeout=%ds) : %s",
            request.user.username, len(created_ids), shell, timeout, command[:80],
        )
        return Response(
            {"status": "created", "command_ids": created_ids, "count": len(created_ids)},
            status=status.HTTP_201_CREATED,
        )


class PendingCommandsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not _verify_agent_token(request):
            return Response({"detail": "Token invalide."}, status=status.HTTP_403_FORBIDDEN)

        mac = request.query_params.get("mac_address", "").strip()
        if not mac:
            return Response({"detail": "mac_address requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            device = Device.objects.get(mac_address=mac)
        except Device.DoesNotExist:
            return Response([])

        pending = RemoteCommand.objects.filter(
            device=device,
            status=RemoteCommand.Status.PENDING,
        ).values("id", "command", "shell", "timeout")

        ids = [c["id"] for c in pending]
        if ids:
            RemoteCommand.objects.filter(id__in=ids).update(
                status=RemoteCommand.Status.RUNNING
            )
            logger.info("Agent %s a récupéré %d commande(s)", mac, len(ids))

        return Response(list(pending))


class CommandResultView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, command_id):
        if not _verify_agent_token(request):
            return Response({"detail": "Token invalide."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CommandResultSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            cmd = RemoteCommand.objects.get(id=command_id)
        except RemoteCommand.DoesNotExist:
            return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)

        mac = data.get("mac_address", "").strip().lower()
        if cmd.device and mac != cmd.device.mac_address.lower():
            return Response(
                {"detail": "Cette commande n'appartient pas a cet agent."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cmd.stdout      = data.get("stdout", "")
        cmd.stderr      = data.get("stderr", "")
        cmd.returncode  = data.get("returncode")
        cmd.status      = data.get("status", RemoteCommand.Status.ERROR)
        cmd.working_directory = data.get("working_directory", "")
        cmd.executed_at = timezone.now()
        cmd.save(update_fields=[
            "stdout",
            "stderr",
            "returncode",
            "status",
            "working_directory",
            "executed_at",
        ])

        logger.info(
            "Résultat commande #%d reçu — status=%s returncode=%s",
            command_id, cmd.status, cmd.returncode,
        )
        return Response({"status": "ok"})


class CancelCommandView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, command_id):
        try:
            cmd = RemoteCommand.objects.get(id=command_id)
        except RemoteCommand.DoesNotExist:
            return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if cmd.status in [
            RemoteCommand.Status.SUCCESS,
            RemoteCommand.Status.ERROR,
            RemoteCommand.Status.TIMEOUT,
            RemoteCommand.Status.EXCEPTION,
            RemoteCommand.Status.CANCELLED,
        ]:
            return Response(
                {"detail": "Cette commande est déjà terminée.", "status": cmd.status},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cmd.cancel_requested = True
        update_fields = ["cancel_requested"]

        if cmd.status == RemoteCommand.Status.PENDING:
            cmd.status = RemoteCommand.Status.CANCELLED
            cmd.stderr = "Commande annulée avant exécution."
            cmd.returncode = -1
            cmd.executed_at = timezone.now()
            update_fields += ["status", "stderr", "returncode", "executed_at"]

        cmd.save(update_fields=update_fields)
        logger.warning(
            "Admin %s a demandé l'annulation de la commande #%d",
            request.user.username,
            command_id,
        )
        return Response({"status": cmd.status, "cancel_requested": True})


class CommandCancelStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, command_id):
        if not _verify_agent_token(request):
            return Response({"detail": "Token invalide."}, status=status.HTTP_403_FORBIDDEN)

        mac = request.query_params.get("mac_address", "").strip().lower()
        if not mac:
            return Response({"detail": "mac_address requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cmd = RemoteCommand.objects.select_related("device").get(id=command_id)
        except RemoteCommand.DoesNotExist:
            return Response({"cancel_requested": False}, status=status.HTTP_404_NOT_FOUND)

        if cmd.device and mac != cmd.device.mac_address.lower():
            return Response(
                {"detail": "Cette commande n'appartient pas a cet agent."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response({"cancel_requested": cmd.cancel_requested})


# ─────────────────────────────────────────────
# 4. ADMIN — Historique des commandes
# ─────────────────────────────────────────────
class CommandHistoryView(APIView):
    """
    GET /api/commands/history/?mac_address=XX&status=success&limit=50
    Réservé aux admins.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, device_id=None):
        qs = RemoteCommand.objects.select_related("device", "created_by").all()

        mac    = request.query_params.get("mac_address")
        status_filter = request.query_params.get("status")
        command_ids = request.query_params.get("command_ids", "")
        limit  = int(request.query_params.get("limit", 50))

        if device_id:
            qs = qs.filter(device_id=device_id)
        if mac:
            qs = qs.filter(device__mac_address=mac)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if command_ids:
            ids = [value for value in command_ids.split(",") if value.strip().isdigit()]
            qs = qs.filter(id__in=ids)

        qs = qs[:limit]
        serializer = RemoteCommandSerializer(qs, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data})
