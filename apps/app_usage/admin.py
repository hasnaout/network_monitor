from django.contrib import admin
from .models import AppUsage


@admin.register(AppUsage)
class AppUsageAdmin(admin.ModelAdmin):
    list_display  = ["app_name", "device", "date", "duration_seconds", "last_updated"]
    list_filter   = ["date", "device"]
    search_fields = ["app_name", "device__name"]
    ordering      = ["-date", "-duration_seconds"]
    readonly_fields = ["last_updated"]
