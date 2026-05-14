from django.db import models
from django.utils import timezone


class RemoteCommand(models.Model):

    class Status(models.TextChoices):
        PENDING   = "pending",   "En attente"
        RUNNING   = "running",   "En cours"
        SUCCESS   = "success",   "Succès"
        ERROR     = "error",     "Erreur"
        TIMEOUT   = "timeout",   "Timeout"
        EXCEPTION = "exception", "Exception"

    # NULL = broadcast à tous les agents
    device = models.ForeignKey(
        "devices.Device",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="commands",
        verbose_name="Agent cible (vide = broadcast)",
    )

    command     = models.TextField(verbose_name="Commande shell")
    timeout     = models.PositiveIntegerField(default=30, verbose_name="Timeout (s)")
    created_by  = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_commands",
        verbose_name="Créé par",
    )
    created_at  = models.DateTimeField(default=timezone.now)

    # Résultat rempli par l'agent
    status      = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    stdout      = models.TextField(blank=True, default="")
    stderr      = models.TextField(blank=True, default="")
    returncode  = models.IntegerField(null=True, blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Commande distante"
        verbose_name_plural = "Commandes distantes"

    def __str__(self):
        target = self.device.name if self.device else "BROADCAST"
        return f"[{self.status}] {target} — {self.command[:50]}"
