from django.contrib import admin
from .models import Heartbeat, Alert

@admin.register(Heartbeat)
class HeartbeatAdmin(admin.ModelAdmin):

    list_display = (
        "device",
        "is_alive",
        "cpu_usage",
        "ram_usage",
        "timestamp",
    )

    list_filter = ("is_alive",)
    ordering = ("-timestamp",)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):

    list_display = (
        "device",
        "alert_type",
        "severity",
        "is_resolved",
        "created_at",
    )

    list_filter = ("severity", "is_resolved")

    search_fields = ("device__name", "message")

    ordering = ("-created_at",)