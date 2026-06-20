from django.urls import path
from .views import AppUsageIngestView, AppUsageListView

urlpatterns = [
    path("apps/",      AppUsageIngestView.as_view(), name="app-usage-ingest"),
    path("apps/list/", AppUsageListView.as_view(),   name="app-usage-list"),
]
