from django.db import models
from django.utils import timezone


class InstalledSoftware(models.Model):
    """
    Un enregistrement par logiciel détecté sur un PC agent.
    La clé métier est (device + name + version) — on remplace à chaque inventaire.
    """
    device       = models.ForeignKey(
        "heartbeat.Device",          # ton modèle Device existant
        on_delete=models.CASCADE,
        related_name="software",
    )
    name         = models.CharField(max_length=255)
    version      = models.CharField(max_length=128, blank=True)
    publisher    = models.CharField(max_length=255, blank=True)
    install_date = models.CharField(max_length=16,  blank=True)  # YYYYMMDD brut
    first_seen   = models.DateTimeField(default=timezone.now)
    last_seen    = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("device", "name", "version")
        ordering        = ["name"]
        verbose_name    = "Logiciel installé"
        verbose_name_plural = "Logiciels installés"

    def __str__(self):
        return f"{self.name} {self.version} — {self.device}"
