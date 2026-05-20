from rest_framework import serializers
from .models import RemoteCommand


class CommandResultSerializer(serializers.Serializer):
    """Payload envoyé par l'agent après exécution."""
    mac_address = serializers.CharField(max_length=64)
    stdout      = serializers.CharField(allow_blank=True, default="")
    stderr      = serializers.CharField(allow_blank=True, default="")
    returncode  = serializers.IntegerField()
    status      = serializers.ChoiceField(choices=["success", "error", "timeout", "exception", "cancelled"])
    working_directory = serializers.CharField(
        allow_blank=True,
        required=False,
        default="",
        max_length=1024,
    )


class CreateCommandSerializer(serializers.ModelSerializer):
    """Payload envoyé par l'admin pour créer une commande."""
    mac_address = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        help_text="Laisser vide pour un broadcast à tous les agents"
    )

    class Meta:
        model  = RemoteCommand
        fields = ["mac_address", "command", "shell", "timeout"]

    def validate_timeout(self, value):
        if value < 1 or value > 1200:
            raise serializers.ValidationError("Timeout entre 1 et 1200 secondes (20 minutes max).")
        return value

    def validate_shell(self, value):
        valid_shells = ["cmd", "powershell"]
        if value not in valid_shells:
            raise serializers.ValidationError(f"Shell invalide. Valeurs acceptées: {valid_shells}")
        return value


class RemoteCommandSerializer(serializers.ModelSerializer):
    """Sérialisation complète pour lecture (dashboard admin)."""
    device_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model  = RemoteCommand
        fields = [
            "id", "device_name", "command", "shell", "timeout",
            "created_by_username", "created_at",
            "status", "stdout", "stderr", "returncode", "working_directory",
            "cancel_requested", "executed_at",
        ]

    def get_device_name(self, obj):
        return obj.device.name if obj.device else "BROADCAST"

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else "system"
