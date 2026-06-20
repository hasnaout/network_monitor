from django.contrib import admin
from .models import Alert, Heartbeat


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "device",
        "alert_type",
        "message",
        "created_at",
    )

    list_filter = (
        "alert_type",
        "created_at",
    )

    search_fields = (
        "message",
        "device__name",
    )


@admin.register(Heartbeat)
class HeartbeatAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "device",
        "is_alive",
        "timestamp",
        "response_time_ms",
    )

    list_filter = (
        "is_alive",
        "timestamp",
    )