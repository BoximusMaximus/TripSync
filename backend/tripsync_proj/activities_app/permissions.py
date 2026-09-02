from django.apps import apps
from rest_framework import permissions
from rest_framework.exceptions import NotFound


def _get_trip(trip_id):
    """
    Lazily resolves trip_app's Trip model via the app registry instead of a
    direct import, since trip_app doesn't exist in this project yet. This
    will start working as soon as trip_app is added to INSTALLED_APPS with
    a `Trip` model.
    """
    Trip = apps.get_model("trip_app", "Trip")
    try:
        return Trip.objects.get(pk=trip_id)
    except Trip.DoesNotExist:
        raise NotFound("Trip not found.")


class IsTripMemberAndVoter(permissions.BasePermission):
    """
    Grants access only to authenticated users who:
      1. Have been added to the trip (are a trip member), AND
      2. Have voted on the trip itself (trip-level voting owned by
         trip_app — separate from voting on individual activities here).

    ASSUMPTIONS — confirm/adjust once trip_app exists:
      - `Trip.members` is a related manager (M2M, or M2M-through) of the
        users who belong to the trip.
      - There is some way to tell whether a user has voted on the trip.
        `_user_has_voted_on_trip` below currently looks for a
        `trip.has_user_voted(user)` method as a placeholder hook; swap it
        for whatever trip_app actually exposes (e.g. a TripVote model:
        `trip.votes.filter(user=user).exists()`).
    """

    message = "You must be a trip member who has voted on this trip to do that."

    def _user_has_voted_on_trip(self, trip, user):
        # TODO: replace with the real check once trip_app exists.
        if hasattr(trip, "has_user_voted"):
            return trip.has_user_voted(user)
        return False

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        trip_id = view.kwargs.get("trip_id")
        trip = _get_trip(trip_id)
        view.trip = trip  # stash so the view doesn't have to look it up again

        is_member = trip.members.filter(pk=request.user.pk).exists()
        has_voted = self._user_has_voted_on_trip(trip, request.user)
        return is_member and has_voted
