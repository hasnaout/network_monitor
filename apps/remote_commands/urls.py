from django.urls import path
from .views import (
    CreateCommandView,
    PendingCommandsView,
    CommandResultView,
    CancelCommandView,
    CommandCancelStatusView,
    CommandHistoryView,
)

urlpatterns = [
                                                      
    path("",                        CreateCommandView.as_view(),   name="command-create"),
    path("execute/",                 CreateCommandView.as_view(),   name="command-execute"),

                                                
    path("pending/",                PendingCommandsView.as_view(), name="command-pending"),

                                                
    path("<int:command_id>/result/", CommandResultView.as_view(),  name="command-result"),
    path("<int:command_id>/cancel-status/", CommandCancelStatusView.as_view(), name="command-cancel-status"),

                                             
    path("<int:command_id>/cancel/", CancelCommandView.as_view(), name="command-cancel"),

                                
    path("history/",                CommandHistoryView.as_view(),  name="command-history"),
    path("history/<int:device_id>/", CommandHistoryView.as_view(),  name="command-history-device"),
]
