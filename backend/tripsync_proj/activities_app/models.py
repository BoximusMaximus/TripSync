from django.conf import settings
from django.db import models
from .validators import validate_cost_cents


class Activity(models.Model):
    #string form - trip_app is another app; deferring the lookup can never go circular
    trip = models.ForeignKey(
        "trip_app.Trip",
        on_delete=models.CASCADE,
        related_name="activities",
    )
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)
    #address is optional (README) - blank=True stores '' which still satisfies ERD NOT NULL
    street = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=255, blank=True, default="")
    state = models.CharField(max_length=255, blank=True, default="")
    zip = models.CharField(max_length=255, blank=True, default="")
    country = models.CharField(max_length=255, blank=True, default="")
    #google's receipt - written by the view from the geocode result, never by the client
    place_id = models.CharField(max_length=255, blank=True, default="")
    cost_estimate_cents = models.IntegerField(default=0, validators=[validate_cost_cents])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} (trip {self.trip_id})"


class ActivityGeocode(models.Model):
    #populated server-side when an activity gets a location; never written by the client
    activity = models.OneToOneField(
        Activity,
        on_delete=models.CASCADE,
        related_name="geocode",
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    formatted_address = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.formatted_address


class ActivityVote(models.Model):
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
        ordering = ["id"]
        #one vote per user per activity - the DB is the backstop, the view answers 409 first
        constraints = [
            models.UniqueConstraint(
                fields=["user", "activity"], name="unique_user_activity_vote"
            )
        ]

    def __str__(self):
        return f"user {self.user_id} -> activity {self.activity_id}"


class Lodging(models.Model):
    #where the group is staying - one per trip; the map centers here and place search is biased here
    trip = models.OneToOneField(
        "trip_app.Trip",
        on_delete=models.CASCADE,
        related_name="lodging",
    )
    name = models.CharField(max_length=255, blank=True)
    street = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=255, blank=True)
    zip = models.CharField(max_length=255, blank=True)
    country = models.CharField(max_length=255, blank=True)
    #google's receipt lives on the row - a lodging IS a location, so there is no "no pin" case
    place_id = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    formatted_address = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name or self.formatted_address} (trip {self.trip_id})"
