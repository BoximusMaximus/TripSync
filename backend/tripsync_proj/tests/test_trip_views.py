from django.contrib.auth import get_user_model
from django.urls import reverse, reverse_lazy
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from group_app.models import Group
from trip_app.models import Trip

from .test_auth_user_views import UnthrottledAPITestCase

Auth_User = get_user_model()


def authenticate(client, user):
    access = RefreshToken.for_user(user).access_token
    client.cookies["access_token"] = str(access)


class CreateTripTests(UnthrottledAPITestCase):
    url = reverse_lazy("create_new_trip")

    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="trip_owner",
            email="trip_owner@example.com",
            password="a-strong-password-1",
        )

    def test_create_trip_requires_authentication(self):
        response = self.client.post(
            self.url,
            {"name": "Ski Trip", "city": "Denver", "state": "CO", "country": "USA"},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_trip_creates_trip_and_group_with_creator_as_member(self):
        authenticate(self.client, self.user)

        response = self.client.post(
            self.url,
            {"name": "Ski Trip", "city": "Denver", "state": "CO", "country": "USA"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        trip = Trip.objects.get(name="Ski Trip")
        group = Group.objects.get(trip=trip)
        self.assertIn(self.user, group.auth_user.all())


class TripByIdTests(UnthrottledAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="trip_owner",
            email="trip_owner@example.com",
            password="a-strong-password-1",
        )
        self.trip = Trip.objects.create(
            name="Beach Trip", city="Miami", state="FL", country="USA"
        )
        self.url = reverse("trip_by_id", args=[self.trip.id])

    def test_get_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_trip(self):
        authenticate(self.client, self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Beach Trip")

    def test_get_unknown_trip_is_not_found(self):
        authenticate(self.client, self.user)

        response = self.client.get(reverse("trip_by_id", args=[999999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_updates_trip(self):
        authenticate(self.client, self.user)

        response = self.client.put(
            self.url,
            {"name": "Beach Trip (Updated)", "city": "Miami", "state": "FL", "country": "USA"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.name, "Beach Trip (Updated)")

    def test_delete_removes_trip(self):
        authenticate(self.client, self.user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Trip.objects.filter(id=self.trip.id).exists())


class TripGroupMembershipTests(UnthrottledAPITestCase):
    """
    A trip has exactly one Group row (Group.trip is a OneToOneField), and
    that single Group holds every member of the trip via its auth_user
    ManyToManyField. "Multiple users on one trip" is represented as multiple
    members on that one Group, not multiple Group rows sharing a trip.
    """

    def setUp(self):
        super().setUp()
        self.trip = Trip.objects.create(
            name="Group Trip", city="Austin", state="TX", country="USA"
        )
        self.users = [
            Auth_User.objects.create_user(
                username=f"member_{i}",
                email=f"member_{i}@example.com",
                password="a-strong-password-1",
            )
            for i in range(3)
        ]

    def test_adding_multiple_users_to_one_trip_uses_a_single_group(self):
        url = reverse("create_new_group")

        for user in self.users:
            authenticate(self.client, user)
            response = self.client.post(url, {"trip_id": self.trip.id})
            self.assertIn(
                response.status_code,
                (status.HTTP_200_OK, status.HTTP_201_CREATED),
            )

        # Exactly one Group row exists for the trip, no matter how many
        # different users joined it.
        self.assertEqual(Group.objects.filter(trip=self.trip).count(), 1)

        group = Group.objects.get(trip=self.trip)
        self.assertEqual(group.auth_user.count(), len(self.users))
        for user in self.users:
            self.assertIn(user, group.auth_user.all())

    def test_group_by_trip_id_reflects_all_members(self):
        group = Group.objects.create(trip=self.trip)
        group.auth_user.add(*self.users)

        authenticate(self.client, self.users[0])
        response = self.client.get(reverse("group_by_trip_id", args=[self.trip.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["auth_user"]), len(self.users))
