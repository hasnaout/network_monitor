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
        CANCELLED = "cancelled", "Annulée"

    class Shell(models.TextChoices):
        CMD         = "cmd",         "Command Prompt (cmd.exe)"
        POWERSHELL  = "powershell",  "PowerShell (pwsh.exe)"

    class Category(models.TextChoices):
        REMOTE_COMMAND = "remote_command", "Remote Command"
        SOFTWARE_INSTALL = "software_install", "Software Install"

    device = models.ForeignKey(
        "devices.Device",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="commands",
        verbose_name="Agent cible (vide = broadcast)",
    )

    command     = models.TextField(verbose_name="Commande shell")
    category    = models.CharField(max_length=32, choices=Category.choices, default=Category.REMOTE_COMMAND)
    package_manager = models.CharField(max_length=32, blank=True, default="")
    package_name = models.CharField(max_length=255, blank=True, default="")
    package_version = models.CharField(max_length=128, blank=True, default="")
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
    working_directory = models.CharField(max_length=1024, blank=True, default="")
    cancel_requested = models.BooleanField(default=False)
    executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Commande distante"
        verbose_name_plural = "Commandes distantes"

    def __str__(self):
        target = self.device.name if self.device else "BROADCAST"
        return f"[{self.status}] {target} — {self.command[:50]}"
