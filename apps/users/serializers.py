from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Ne jamais exposer le mot de passe
        fields = ['id', 'username', 'email', 'role', 'phone']