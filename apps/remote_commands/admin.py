from django.contrib import admin
from .models import RemoteCommand


@admin.register(RemoteCommand)
class RemoteCommandAdmin(admin.ModelAdmin):
    list_display  = [
        "id", "get_target", "command_preview", "status",
        "returncode", "created_by", "created_at", "executed_at"
    ]
    list_filter   = ["status", "created_at", "device"]
    search_fields = ["command", "device__name", "device__mac_address"]
    readonly_fields = ["created_at", "executed_at", "stdout", "stderr", "returncode", "status"]
    ordering      = ["-created_at"]

    @admin.display(description="Cible")
    def get_target(self, obj):
        return obj.device.name if obj.device else " BROADCAST"

    @admin.display(description="Commande")
    def command_preview(self, obj):
        return obj.command[:60] + ("…" if len(obj.command) > 60 else "")
