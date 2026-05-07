from rest_framework import serializers
from .models import InstalledSoftware


class SoftwareItemSerializer(serializers.Serializer):
    """Valide un seul logiciel reçu depuis l'agent."""
    name         = serializers.CharField(max_length=255)
    version      = serializers.CharField(max_length=128, allow_blank=True, default="")
    publisher    = serializers.CharField(max_length=255, allow_blank=True, default="")
    install_date = serializers.CharField(max_length=16,  allow_blank=True, default="")


class SoftwareInventorySerializer(serializers.Serializer):
    """Valide le payload complet envoyé par l'agent."""
    mac_address = serializers.CharField(max_length=64)
    hostname    = serializers.CharField(max_length=255)
    software    = SoftwareItemSerializer(many=True)


class InstalledSoftwareSerializer(serializers.ModelSerializer):
    """Sérialise un logiciel pour les réponses API (lecture)."""
    class Meta:
        model  = InstalledSoftware
        fields = ["id", "name", "version", "publisher", "install_date", "first_seen", "last_seen"]
