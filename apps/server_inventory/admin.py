from django.contrib import admin
from .models import InstalledSoftware


@admin.register(InstalledSoftware)
class InstalledSoftwareAdmin(admin.ModelAdmin):
    list_display = ["name", "device"]
    list_filter = ["device"]
    search_fields = ["name", "device__name", "device__mac_address"]
    ordering = ["name"]
