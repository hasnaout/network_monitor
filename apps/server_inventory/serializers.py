from rest_framework import serializers
from .models import InstalledSoftware


class SoftwareItemSerializer(serializers.Serializer):
    """Valide un seul logiciel reçu depuis l'agent."""
    name = serializers.CharField(max_length=255)


class SoftwareInventorySerializer(serializers.Serializer):
    mac_address = serializers.CharField(max_length=64)
    hostname = serializers.CharField(max_length=255)
    software = SoftwareItemSerializer(many=True)


class InstalledSoftwareSerializer(serializers.ModelSerializer):
    """Sérialise un logiciel pour les réponses API (lecture)."""

    class Meta:
        model = InstalledSoftware
        fields = ["id", "name"]
