from django.urls import path
from .views import (
    CreateCommandView,
    SoftwareInstallView,
    PendingCommandsView,
    CommandResultView,
    CancelCommandView,
    CommandCancelStatusView,
    CommandHistoryView,
)

urlpatterns = [
    # Admin → créer une commande (ciblée ou broadcast)
    path("",                        CreateCommandView.as_view(),   name="command-create"),
    path("execute/",                 CreateCommandView.as_view(),   name="command-execute"),
    path("software-install/",        SoftwareInstallView.as_view(), name="software-install"),

    # Agent → récupérer ses commandes en attente
    path("pending/",                PendingCommandsView.as_view(), name="command-pending"),

    # Agent → envoyer le résultat d'une commande
    path("<int:command_id>/result/", CommandResultView.as_view(),  name="command-result"),
    path("<int:command_id>/cancel-status/", CommandCancelStatusView.as_view(), name="command-cancel-status"),

    # Admin → demander l'arrêt d'une commande
    path("<int:command_id>/cancel/", CancelCommandView.as_view(), name="command-cancel"),

    # Admin → historique complet
    path("history/",                CommandHistoryView.as_view(),  name="command-history"),
    path("history/<int:device_id>/", CommandHistoryView.as_view(),  name="command-history-device"),
]
