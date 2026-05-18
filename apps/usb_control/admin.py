from django.contrib import admin
from .models import USBAlert, USBDevice, USBHistory, USBPolicy


@admin.register(USBDevice)
class USBDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "device", "mount_point", "status", "is_trusted", "last_connected")
    list_filter = ("status", "is_trusted")
    search_fields = ("name", "serial_number", "device__name", "device__mac_address")


@admin.register(USBPolicy)
class USBPolicyAdmin(admin.ModelAdmin):
    list_display = ("device", "default_policy", "allow_unknown_devices", "updated_at")


@admin.register(USBHistory)
class USBHistoryAdmin(admin.ModelAdmin):
    list_display = ("usb_device", "device", "event_type", "created_at")
    list_filter = ("event_type",)


@admin.register(USBAlert)
class USBAlertAdmin(admin.ModelAdmin):
    list_display = ("device", "usb_device", "severity", "is_read", "created_at")
    list_filter = ("severity", "is_read")
