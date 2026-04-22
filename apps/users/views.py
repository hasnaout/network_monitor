from rest_framework import viewsets
<<<<<<< HEAD
from rest_framework.permissions import IsAuthenticated, IsAdminUser
=======
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import status
>>>>>>> 61da80e1d9fe001d2328834aa6f89d7eaee311e5
from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API pour les utilisateurs (Admin uniquement)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
<<<<<<< HEAD
    permission_classes = [IsAuthenticated, IsAdminUser]
=======


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    return Response({"detail": "Authenticated."})
>>>>>>> 61da80e1d9fe001d2328834aa6f89d7eaee311e5
