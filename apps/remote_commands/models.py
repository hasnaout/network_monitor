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

    class Shell(models.TextChoices):
        CMD         = "cmd",         "Command Prompt (cmd.exe)"
        POWERSHELL  = "powershell",  "PowerShell (pwsh.exe)"

    device = models.ForeignKey(
        "devices.Device",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="commands",
        verbose_name="Agent cible (vide = broadcast)",
    )

    command     = models.TextField(verbose_name="Commande shell")
    shell       = models.CharField(max_length=16, choices=Shell.choices, default=Shell.CMD, verbose_name="Shell utilisé")
    timeout     = models.PositiveIntegerField(default=30, verbose_name="Timeout (s)")
    created_by  = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_commands",
        verbose_name="Créé par",
    )
    created_at  = models.DateTimeField(default=timezone.now)

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
