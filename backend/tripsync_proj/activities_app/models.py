from django.conf import settings
from django.db import models
# date 09/02/2026
# currently claude ai has created an outline
# Iam still working on my personal project

class Activity(models.Model):
    """
    A single proposed activity within a trip's itinerary.
    Trip members vote on these to help the group decide what to do.
    """

    # NOTE: trip_app doesn't exist yet — referenced by string so this app can
    # be written/migrated independently. Confirm "trip_app.Trip" is the
    # correct app/model name once trip_app is created.
    trip = models.ForeignKey(
        "trip_app.Trip",
        on_delete=models.CASCADE,
        related_name="activities",
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} (trip {self.trip_id})"

    @property
    def vote_count(self):
        return self.votes.count()


class ActivityVote(models.Model):
    """
    Records that a user voted for a given activity.
    One vote per user per activity — cast with POST, remove with DELETE
    on the vote endpoint (see views.ActivityVoteView).
    """

    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["activity", "user"], name="unique_activity_vote_per_user"
            )
        ]

    def __str__(self):
        return f"user {self.user_id} -> activity {self.activity_id}"
