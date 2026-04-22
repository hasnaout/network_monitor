from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.devices.views import DeviceViewSet
from apps.monitoring.views import HeartbeatViewSet, AlertViewSet
from apps.users.views import UserViewSet

router = DefaultRouter()
router.register(r'devices', DeviceViewSet, basename='device')
router.register(r'monitoring', HeartbeatViewSet, basename='monitoring')
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/', include(router.urls)),
]
