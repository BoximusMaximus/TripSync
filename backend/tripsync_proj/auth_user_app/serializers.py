from rest_framework import serializers

from .models import Auth_User

class AuthUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Auth_User
        fields = ["id", "username", "email"]
        read_only_fields = ["id"]