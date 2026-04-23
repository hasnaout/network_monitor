from django.contrib import admin
from .models import Device

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "ip_address",
        "status",
        "last_seen",
        "device_type",
    )

    search_fields = (
        "name",
        "mac_address",
        "ip_address",
    )

    list_filter = (
        "status",
        "device_type",
    )

    ordering = ("-last_seen",)

    readonly_fields = ("created_at", "last_seen")