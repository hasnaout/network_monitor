from rest_framework.routers import DefaultRouter
from .views import USBAlertViewSet, USBDeviceViewSet, USBHistoryViewSet, USBPolicyViewSet

router = DefaultRouter()
router.register("devices", USBDeviceViewSet, basename="usb-device")
router.register("policies", USBPolicyViewSet, basename="usb-policy")
router.register("history", USBHistoryViewSet, basename="usb-history")
router.register("alerts", USBAlertViewSet, basename="usb-alert")

urlpatterns = router.urls
