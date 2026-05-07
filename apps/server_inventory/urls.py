from django.urls import path
from .views import SoftwareInventoryView, DeviceSoftwareListView

urlpatterns = [
    # Agent envoie l'inventaire complet (POST)
    # Dashboard consulte la liste d'un device (GET)
    path("software/", SoftwareInventoryView.as_view(), name="software-inventory-post"),
    path("software/list/", DeviceSoftwareListView.as_view(), name="software-inventory-list"),
]
