from django.db import models
from auth_user_app.models import Auth_User
from trip_app.models import Trip

# Create your models here.
class Group(models.Model):
    auth_user = models.ManyToManyField(
        Auth_User,
        related_name="groups"
    )
    trip = models.OneToOneField(
        Trip,
        related_name="group",
        on_delete=models.CASCADE
    )
    def __str__(self):
        return f"GROUP: User: {self.auth_user} | Trip: {self.trip}"