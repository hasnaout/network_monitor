from django.urls import path
from .views import (
    CreateCommandView,
    PendingCommandsView,
    CommandResultView,
    CommandHistoryView,
)

urlpatterns = [
    # Admin → créer une commande (ciblée ou broadcast)
    path("",                        CreateCommandView.as_view(),   name="command-create"),

    # Agent → récupérer ses commandes en attente
    path("pending/",                PendingCommandsView.as_view(), name="command-pending"),

    # Agent → envoyer le résultat d'une commande
    path("<int:command_id>/result/", CommandResultView.as_view(),  name="command-result"),

    # Admin → historique complet
    path("history/",                CommandHistoryView.as_view(),  name="command-history"),
]
