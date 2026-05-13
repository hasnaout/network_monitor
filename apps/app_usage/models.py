from django.db import models
from django.utils import timezone


class AppUsage(models.Model):
    """
    Temps d'utilisation d'une application sur un poste client.
    La clé métier est (device + app_name + date) :
    - Si l'agent envoie plusieurs fois dans la journée, on incrémente duration_seconds.
    - On garde ainsi un historique jour par jour.
    """
    device = models.ForeignKey(
        "devices.Device",
        on_delete=models.CASCADE,
        related_name="app_usages",
    )
    app_name         = models.CharField(max_length=255, verbose_name="Application")
    date             = models.DateField(default=timezone.localdate, verbose_name="Date")
    duration_seconds = models.PositiveIntegerField(default=0, verbose_name="Durée (s)")
    last_updated     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together     = ("device", "app_name", "date")
        ordering            = ["-date", "-duration_seconds"]
        verbose_name        = "Utilisation application"
        verbose_name_plural = "Utilisations applications"

    def __str__(self):
        minutes = self.duration_seconds // 60
        return f"{self.app_name} — {self.device} — {self.date} ({minutes} min)"
