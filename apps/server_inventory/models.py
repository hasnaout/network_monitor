from django.db import models


class InstalledSoftware(models.Model):
    device = models.ForeignKey(
        "devices.Device",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)

    class Meta:
        unique_together = ("device", "name")
        ordering = ["name"]
        verbose_name = "Logiciel installé"
        verbose_name_plural = "Logiciels installés"

    def __str__(self):
        return f"{self.name} — {self.device}"
