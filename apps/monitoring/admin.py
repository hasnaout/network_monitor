from django.contrib import admin
from .models import Heartbeat, Alert

admin.site.register(Heartbeat)
admin.site.register(Alert)