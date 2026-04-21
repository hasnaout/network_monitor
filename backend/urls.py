from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.devices.views import DeviceViewSet
from apps.monitoring.views import HeartbeatViewSet, AlertViewSet
from apps.rapport.views import ReportViewSet
from apps.users.views import UserViewSet

router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'monitoring', HeartbeatViewSet, basename='monitoring')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]