from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.devices.views import DeviceViewSet
from apps.monitoring.views import HeartbeatViewSet, AlertViewSet
from apps.users.views import UserViewSet

router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'heartbeat', HeartbeatViewSet, basename='heartbeat')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('admin/', admin.site.urls),

    # AUTH
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    # API
    path('api/', include(router.urls)),
]