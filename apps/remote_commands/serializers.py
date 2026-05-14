from rest_framework import serializers
from .models import RemoteCommand


class CommandResultSerializer(serializers.Serializer):
    """Payload envoyé par l'agent après exécution."""
    mac_address = serializers.CharField(max_length=64)
    stdout      = serializers.CharField(allow_blank=True, default="")
    stderr      = serializers.CharField(allow_blank=True, default="")
    returncode  = serializers.IntegerField()
    status      = serializers.ChoiceField(choices=["success", "error", "timeout", "exception"])


class CreateCommandSerializer(serializers.ModelSerializer):
    """Payload envoyé par l'admin pour créer une commande."""
    mac_address = serializers.CharField(
        required=False, allow_blank=True, allow_null=True,
        help_text="Laisser vide pour un broadcast à tous les agents"
    )

    class Meta:
        model  = RemoteCommand
        fields = ["mac_address", "command", "timeout"]

    def validate_timeout(self, value):
        if value < 1 or value > 300:
            raise serializers.ValidationError("Timeout entre 1 et 300 secondes.")
        return value


class RemoteCommandSerializer(serializers.ModelSerializer):
    """Sérialisation complète pour lecture (dashboard admin)."""
    device_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model  = RemoteCommand
        fields = [
            "id", "device_name", "command", "timeout",
            "created_by_username", "created_at",
            "status", "stdout", "stderr", "returncode", "executed_at",
        ]

    def get_device_name(self, obj):
        return obj.device.name if obj.device else "BROADCAST"

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else "system"
