from rest_framework import serializers

from .models import Trip

class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ["id", "name", "city", "state", "country"]
        read_only_fields = ["id"]