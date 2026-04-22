from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API pour les utilisateurs (Admin uniquement)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
