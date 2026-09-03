from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Activity, ActivityVote
from .permissions import IsTripMemberAndVoter
from .serializers import ActivitySerializer


class ActivityListCreateView(generics.ListCreateAPIView):
    """
    GET  /trips/<trip_id>/activities/   - list all activities for a trip
    POST /trips/<trip_id>/activities/   - add a new activity to the trip
    """

    serializer_class = ActivitySerializer
    permission_classes = [IsTripMemberAndVoter]

    def get_queryset(self):
        return Activity.objects.filter(trip_id=self.kwargs["trip_id"])

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        # self.trip is stashed on the view by IsTripMemberAndVoter.has_permission
        serializer.save(trip=self.trip, created_by=self.request.user)


class ActivityDeleteView(generics.DestroyAPIView):
    """
    DELETE /trips/<trip_id>/activities/<activity_id>/  - remove an activity
    """

    serializer_class = ActivitySerializer
    permission_classes = [IsTripMemberAndVoter]
    lookup_url_kwarg = "activity_id"

    def get_queryset(self):
        return Activity.objects.filter(trip_id=self.kwargs["trip_id"])


class ActivityVoteView(APIView):
    """
    POST   /trips/<trip_id>/activities/<activity_id>/vote/  - cast a vote
    DELETE /trips/<trip_id>/activities/<activity_id>/vote/  - remove your vote
    """

    permission_classes = [IsTripMemberAndVoter]

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs["activity_id"], trip_id=self.kwargs["trip_id"]
        )

    def post(self, request, *args, **kwargs):
        activity = self.get_activity()
        vote, created = ActivityVote.objects.get_or_create(
            activity=activity, user=request.user
        )
        if not created:
            return Response(
                {"detail": "You already voted for this activity.", "vote_count": activity.vote_count},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"detail": "Vote recorded.", "vote_count": activity.vote_count},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, *args, **kwargs):
        activity = self.get_activity()
        deleted, _ = ActivityVote.objects.filter(
            activity=activity, user=request.user
        ).delete()
        if not deleted:
            return Response(
                {"detail": "You haven't voted for this activity."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"detail": "Vote removed.", "vote_count": activity.vote_count},
            status=status.HTTP_200_OK,
        )
