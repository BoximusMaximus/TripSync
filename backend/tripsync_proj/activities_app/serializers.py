from rest_framework import serializers

from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    vote_count = serializers.ReadOnlyField()
    has_voted = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Activity
        fields = [
            "id",
            "trip",
            "name",
            "description",
            "location",
            "created_by",
            "created_at",
            "updated_at",
            "vote_count",
            "has_voted",
        ]
        read_only_fields = ["id", "trip", "created_by", "created_at", "updated_at"]

    def get_has_voted(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()
