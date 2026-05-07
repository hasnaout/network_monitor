from django.contrib import admin
from .models import InstalledSoftware


@admin.register(InstalledSoftware)
class InstalledSoftwareAdmin(admin.ModelAdmin):
    list_display  = ["name", "version", "publisher", "device", "install_date", "last_seen"]
    list_filter   = ["device", "publisher"]
    search_fields = ["name", "publisher", "version"]
    ordering      = ["name"]
    readonly_fields = ["first_seen", "last_seen"]
