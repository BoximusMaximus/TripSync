from rest_framework import serializers
from .models import Activity, Lodging


class ActivitySerializer(serializers.ModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    formatted_address = serializers.SerializerMethodField()
    vote_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            "id",
            "trip",
            "name",
            "description",
            "street",
            "city",
            "state",
            "zip",
            "country",
            "place_id",
            "cost_estimate_cents",
            "latitude",
            "longitude",
            "formatted_address",
            "vote_count",
            "has_voted",
            "created_at",
            "updated_at",
        ]
        #google owns place_id; the clock owns the timestamps
        read_only_fields = ["place_id", "created_at", "updated_at"]

    #hasattr guard - no geocode row (no location) -> null, never a crash
    def get_latitude(self, obj):
        if hasattr(obj, "geocode"):
            return float(obj.geocode.latitude)
        return None

    def get_longitude(self, obj):
        if hasattr(obj, "geocode"):
            return float(obj.geocode.longitude)
        return None

    def get_formatted_address(self, obj):
        if hasattr(obj, "geocode"):
            return obj.geocode.formatted_address
        return None

    #N+1 - two queries per activity on the list; fine at trip scale, annotate is the fix
    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_has_voted(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()


class LodgingSerializer(serializers.ModelSerializer):
    #no hasattr guard - a lodging row always has its pin; the cast is for the map (Decimal renders as a string)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Lodging
        fields = [
            "id",
            "trip",
            "name",
            "street",
            "city",
            "state",
            "zip",
            "country",
            "place_id",
            "latitude",
            "longitude",
            "formatted_address",
            "created_at",
            "updated_at",
        ]
        #trip comes from the URL; google owns the pin fields; the clock owns the timestamps
        read_only_fields = ["trip", "place_id", "formatted_address", "created_at", "updated_at"]

    def get_latitude(self, obj):
        return float(obj.latitude)

    def get_longitude(self, obj):
        return float(obj.longitude)
