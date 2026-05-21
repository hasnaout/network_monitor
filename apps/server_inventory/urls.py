from django.urls import path
from .views import SoftwareInventoryView, DeviceSoftwareListView

urlpatterns = [
                                              
                                                   
    path("software/", SoftwareInventoryView.as_view(), name="software-inventory-post"),
    path("software/list/", DeviceSoftwareListView.as_view(), name="software-inventory-list"),
]
