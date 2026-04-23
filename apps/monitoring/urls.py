from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, HeartbeatViewSet

router = DefaultRouter()
router.register(r'alerts', AlertViewSet, basename='alert')
router.register(r'heartbeat', HeartbeatViewSet, basename='heartbeat')

urlpatterns = [
    path('', include(router.urls)),
]