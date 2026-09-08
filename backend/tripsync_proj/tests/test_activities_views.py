from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from activities_app.models import Activity, ActivityGeocode, ActivityVote, Lodging
from tests.test_auth_user_views import UnthrottledAPITestCase
from trip_app.models import Trip

Auth_User = get_user_model()

GOOGLE_ENV = {"GOOGLE_MAPS_SERVER_KEY": "test-key"}

#v4 shapes: the address endpoint wraps in 'results', the place endpoint returns one bare object
V4_ADDRESS = {"results": [{
    "placeId": "ChIJaddress",
    "location": {"latitude": 21.284301, "longitude": -157.812345},
    "formattedAddress": "933 Kapahulu Ave, Honolulu, HI 96816, USA",
}]}
V4_PLACE = {
    "placeId": "ChIJplace",
    "location": {"latitude": 21.275000, "longitude": -157.825000},
    "formattedAddress": "Waikiki Beach, Honolulu, HI 96815, USA",
}
#places (new) text search shape: a 'places' list; displayName is an object
PLACES_RESULT = {"places": [{
    "id": "ChIJpizza",
    "displayName": {"text": "Pizza Place", "languageCode": "en"},
    "formattedAddress": "1 Pizza St, Honolulu, HI 96815, USA",
    "location": {"latitude": 21.28, "longitude": -157.83},
}]}


#Trip's three address fields are required since trip_app merged; one function owns that fact
def make_trip(name="Oahu weekend"):
    return Trip.objects.create(name=name, city="Honolulu", state="HI", country="USA")


#seeded thru the ORM - geocoding isn't under test where this is used
def make_lodging(trip):
    return Lodging.objects.create(
        trip=trip, name="Airbnb", street="2199 Kalia Rd", city="Honolulu", state="HI",
        zip="96815", country="United States", place_id="ChIJlodging",
        latitude="21.275000", longitude="-157.825000",
        formatted_address="2199 Kalia Rd, Honolulu, HI 96815, USA",
    )


#the CJs stub - a tiny class plays google; status_code because the helper checks it
def mock_google(status_code, payload):
    return type(
        "MockResponse", (), {"status_code": status_code, "json": lambda self: payload}
    )()


class ActivityTestCase(UnthrottledAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="dom", email="dom@example.com", password="a-strong-password-1"
        )
        self.trip = make_trip()
        #cookie set directly - repo precedent (test_auth_user_views.py); the jar carries it on every call
        self.client.cookies["access_token"] = str(
            RefreshToken.for_user(self.user).access_token
        )


class ActivityCreateTests(ActivityTestCase):

    #tests the graded server-side API - a Places pick is geocoded and BOTH rows land
        # place_id on the activity is google's answer, not the client's string
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_01_create_with_place_id_geocodes_and_saves_pin(self, mock_get):
        mock_get.return_value = mock_google(200, V4_PLACE)
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Surf lesson", "street": "Waikiki Beach",
             "city": "Honolulu", "state": "HI", "zip": "96815", "country": "United States",
             "place_id": "ChIJplace", "cost_estimate_cents": 7500},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        activity = Activity.objects.get()
        self.assertEqual(activity.place_id, "ChIJplace")
        self.assertEqual(float(activity.geocode.latitude), 21.275)
        self.assertEqual(resp.data["latitude"], 21.275)            #number, not string
        self.assertEqual(resp.data["vote_count"], 0)
        self.assertFalse(resp.data["has_voted"])
        self.assertTrue(mock_get.call_args.args[0].endswith("/geocode/places/ChIJplace"))

    #tests the order contract - google says no BEFORE any write -> 400 and NO orphan activity row
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_google_failure_returns_400_and_no_orphan_row(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Mystery spot", "street": "1 Nowhere Rd"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"error": "Address could not be geocoded"})
        self.assertEqual(Activity.objects.count(), 0)
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the optional-address rule (README) - no location -> 201, no pin, google never called
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_create_without_location_skips_google(self, mock_get):
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Sleep in", "cost_estimate_cents": 0},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        mock_get.assert_not_called()
        self.assertIsNone(resp.data["latitude"])
        self.assertEqual(resp.data["place_id"], "")
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the field-error 400 - the validator runs before any google call
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_negative_cost_is_a_field_error(self, mock_get):
        resp = self.client.post(
            reverse("all_activities"),
            {"trip": self.trip.id, "name": "Free dive", "cost_estimate_cents": -5},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 400)
        self.assertIn("cost_estimate_cents", resp.data)
        mock_get.assert_not_called()

    #tests the parent check - an unknown trip id is a serializer 400, not a 500
    def test_05_unknown_trip_is_400(self):
        resp = self.client.post(
            reverse("all_activities"), {"trip": 999, "name": "Ghost"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("trip", resp.data)

    #tests the base class - no cookie -> 401 (IsAuthenticated on ActivityView)
    def test_06_anonymous_is_401(self):
        resp = APIClient().post(
            reverse("all_activities"), {"trip": self.trip.id, "name": "x"}, format="json"
        )
        self.assertEqual(resp.status_code, 401)

    #tests the atomic contract for real - the second INSERT dies -> the first is rolled back with it
        # bottom decorator = first arg; patching the manager's create makes the geocode row fail after the activity row succeeded
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    @patch("activities_app.views.ActivityGeocode.objects.create", side_effect=RuntimeError("db down"))
    def test_07_geocode_row_failure_rolls_back_activity(self, mock_create, mock_get):
        mock_get.return_value = mock_google(200, V4_PLACE)
        with self.assertRaises(RuntimeError):
            self.client.post(
                reverse("all_activities"),
                {"trip": self.trip.id, "name": "Surf lesson", "place_id": "ChIJplace"},
                format="json",
            )
        self.assertEqual(Activity.objects.count(), 0)


class ActivityListTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.other_trip = make_trip("Maui week")
        #seeded thru the ORM - geocoding isn't under test here
        Activity.objects.create(trip=self.trip, name="Surf")
        Activity.objects.create(trip=self.trip, name="Hike")
        Activity.objects.create(trip=self.other_trip, name="Road to Hana")

    #tests the ?trip= contract - missing or non-numeric -> 400 (no int converter on a query param)
    def test_01_list_requires_trip_param(self):
        self.assertEqual(self.client.get(reverse("all_activities")).status_code, 400)
        self.assertEqual(
            self.client.get(reverse("all_activities"), {"trip": "abc"}).status_code, 400
        )

    #tests the parent lookup - unknown trip -> 404
    def test_02_unknown_trip_is_404(self):
        resp = self.client.get(reverse("all_activities"), {"trip": 999})
        self.assertEqual(resp.status_code, 404)

    #tests scoping + ordering - only that trip's rows, ascending id (Meta.ordering)
    def test_03_lists_only_that_trips_activities_by_id(self):
        resp = self.client.get(reverse("all_activities"), {"trip": self.trip.id})
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual([a["name"] for a in resp.data], ["Surf", "Hike"])
        self.assertEqual(resp.data[0]["vote_count"], 0)
        self.assertFalse(resp.data[0]["has_voted"])

    #tests the base class on GET - no cookie -> 401
    def test_04_anonymous_is_401(self):
        resp = APIClient().get(reverse("all_activities"), {"trip": self.trip.id})
        self.assertEqual(resp.status_code, 401)


class ActivityEditTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.activity = Activity.objects.create(
            trip=self.trip, name="Surf lesson", street="Waikiki Beach", city="Honolulu",
            state="HI", zip="96815", country="United States", place_id="ChIJold",
            cost_estimate_cents=7500,
        )
        ActivityGeocode.objects.create(
            activity=self.activity, latitude="21.275000", longitude="-157.825000",
            formatted_address="Waikiki Beach, Honolulu, HI 96815, USA",
        )

    #tests the frontend's edit shape - PATCH name/description/cost never touches google
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_01_patch_name_only_keeps_pin_and_skips_google(self, mock_get):
        resp = self.client.patch(
            reverse("an_activity", args=[self.activity.id]),
            {"name": "Surf lesson (10am)", "cost_estimate_cents": 8000},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        mock_get.assert_not_called()
        self.assertEqual(resp.data["name"], "Surf lesson (10am)")
        self.assertEqual(resp.data["latitude"], 21.275)
        self.assertEqual(resp.data["place_id"], "ChIJold")

    #tests re-geocode on address change - the new pin AND google's new place_id replace the old
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_put_new_street_regeocodes(self, mock_get):
        mock_get.return_value = mock_google(200, V4_ADDRESS)
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]),
            {"street": "933 Kapahulu Ave", "zip": "96816"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        mock_get.assert_called_once()
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.place_id, "ChIJaddress")
        self.assertEqual(float(self.activity.geocode.latitude), 21.284301)
        self.assertEqual(resp.data["latitude"], 21.284301)       #response reflects the DB, not a cache
        self.assertEqual(ActivityGeocode.objects.count(), 1)      #updated, not duplicated

    #tests the update contract - google fails on edit -> 200 and the OLD pin survives
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_google_failure_on_edit_keeps_old_pin(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]),
            {"street": "1 Nowhere Rd"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["street"], "1 Nowhere Rd")     #the edit itself is saved
        self.assertEqual(resp.data["latitude"], 21.275)           #old pin kept
        self.assertEqual(resp.data["place_id"], "ChIJold")

    #tests the optional-address rule on edit - blanking every location field drops the pin
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_blanking_address_drops_pin(self, mock_get):
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]),
            {"street": "", "city": "", "state": "", "zip": "", "country": "", "place_id": ""},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        mock_get.assert_not_called()
        self.assertIsNone(resp.data["latitude"])
        self.assertEqual(resp.data["place_id"], "")
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the no-re-parent rule - an activity belongs to its trip from birth
    def test_05_trip_cannot_change(self):
        other = make_trip("Maui week")
        resp = self.client.put(
            reverse("an_activity", args=[self.activity.id]), {"trip": other.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.activity.refresh_from_db()
        self.assertEqual(self.activity.trip_id, self.trip.id)

    #tests delete - 204 with no body, and CASCADE takes the pin with it
    def test_06_delete_returns_204_and_cascades(self):
        resp = self.client.delete(reverse("an_activity", args=[self.activity.id]))
        with self.subTest():
            self.assertEqual(resp.status_code, 204)
        self.assertEqual(Activity.objects.count(), 0)
        self.assertEqual(ActivityGeocode.objects.count(), 0)

    #tests the helper - unknown id -> 404 (get_object_or_404, never a bare .get())
    def test_07_unknown_id_is_404(self):
        self.assertEqual(self.client.get(reverse("an_activity", args=[999])).status_code, 404)


class ActivityVoteTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.activity = Activity.objects.create(trip=self.trip, name="Surf")
        self.url = reverse("activity_vote", args=[self.activity.id])

    #tests cast - 201 with the fresh activity so the client can drop its local +1
    def test_01_vote_returns_201_with_fresh_counts(self):
        resp = self.client.post(self.url)
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data["has_voted"])
        self.assertEqual(resp.data["vote_count"], 1)
        self.assertEqual(ActivityVote.objects.count(), 1)

    #tests the one-vote rule - second cast -> 409, the row count does not move
    def test_02_duplicate_vote_is_409(self):
        ActivityVote.objects.create(activity=self.activity, user=self.user)
        resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(ActivityVote.objects.count(), 1)

    #tests remove - 204 and the row is gone
    def test_03_remove_vote_is_204(self):
        ActivityVote.objects.create(activity=self.activity, user=self.user)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(ActivityVote.objects.count(), 0)

    #tests remove-when-absent - scoped lookup answers 404
    def test_04_remove_absent_vote_is_404(self):
        self.assertEqual(self.client.delete(self.url).status_code, 404)

    #tests has_voted is per user - someone else's vote counts but isn't mine
    def test_05_other_users_vote_is_counted_but_not_mine(self):
        other = Auth_User.objects.create_user(
            username="cody", email="cody@example.com", password="a-strong-password-1"
        )
        ActivityVote.objects.create(activity=self.activity, user=other)
        resp = self.client.get(reverse("an_activity", args=[self.activity.id]))
        self.assertEqual(resp.data["vote_count"], 1)
        self.assertFalse(resp.data["has_voted"])


class LodgingTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("a_lodging", args=[self.trip.id])

    #tests the not-set-yet contract - 404 is what tells the frontend to show the lodging form
    def test_01_get_before_set_is_404(self):
        self.assertEqual(self.client.get(self.url).status_code, 404)

    #tests the graded server-side API - a Places pick is geocoded and the pin lands ON the row
        # 201 because the row was created; place_id is google's answer
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_put_with_place_id_creates_201(self, mock_get):
        mock_get.return_value = mock_google(200, V4_PLACE)
        resp = self.client.put(
            self.url, {"name": "Airbnb", "place_id": "ChIJplace"}, format="json"
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 201)
        lodging = Lodging.objects.get(trip=self.trip)
        self.assertEqual(lodging.place_id, "ChIJplace")
        self.assertEqual(float(lodging.latitude), 21.275)
        self.assertEqual(resp.data["latitude"], 21.275)            #number, not string
        self.assertEqual(resp.data["trip"], self.trip.id)
        self.assertTrue(mock_get.call_args.args[0].endswith("/geocode/places/ChIJplace"))

    #tests replace - a second PUT re-geocodes, answers 200, and there is still ONE row
        # fields not sent go back to '' - "replace" means the whole row, not a merge
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_put_again_replaces_and_keeps_one_row(self, mock_get):
        make_lodging(self.trip)
        mock_get.return_value = mock_google(200, V4_ADDRESS)
        resp = self.client.put(
            self.url,
            {"street": "933 Kapahulu Ave", "city": "Honolulu", "state": "HI", "zip": "96816"},
            format="json",
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(Lodging.objects.count(), 1)
        lodging = Lodging.objects.get(trip=self.trip)
        self.assertEqual(lodging.place_id, "ChIJaddress")
        self.assertEqual(float(lodging.longitude), -157.812345)
        self.assertEqual(lodging.name, "")                          #not sent -> replaced with ''
        self.assertEqual(lodging.country, "")
        self.assertTrue(mock_get.call_args.args[0].endswith("/v4/geocode/address/933%20Kapahulu%20Ave%2C%20Honolulu%2C%20HI%2C%2096816"))

    #tests the nothing-to-geocode 400 - google is never called and no row is written
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_put_without_location_is_400(self, mock_get):
        resp = self.client.put(self.url, {"name": "Somewhere"}, format="json")
        self.assertEqual(resp.status_code, 400)
        mock_get.assert_not_called()
        self.assertEqual(Lodging.objects.count(), 0)

    #tests the order contract - google says no BEFORE any write -> 400 and no row (CJs's strict rule)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_05_google_failure_is_400_and_no_row(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        resp = self.client.put(self.url, {"street": "1 Nowhere Rd"}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"error": "Address could not be geocoded"})
        self.assertEqual(Lodging.objects.count(), 0)

    #tests read - the lodging comes back with numeric coordinates for the map center
    def test_06_get_after_set_returns_lodging(self):
        make_lodging(self.trip)
        resp = self.client.get(self.url)
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["name"], "Airbnb")
        self.assertEqual(resp.data["latitude"], 21.275)
        self.assertEqual(resp.data["longitude"], -157.825)

    #tests delete - 204, row gone, and the trip itself is untouched
    def test_07_delete_is_204(self):
        make_lodging(self.trip)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(Lodging.objects.count(), 0)
        self.assertTrue(Trip.objects.filter(id=self.trip.id).exists())

    #tests the parent check - unknown trip -> 404 on PUT (get_object_or_404 on Trip, never a bare .get())
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_08_unknown_trip_is_404(self, mock_get):
        resp = self.client.put(
            reverse("a_lodging", args=[999]), {"place_id": "ChIJplace"}, format="json"
        )
        self.assertEqual(resp.status_code, 404)
        mock_get.assert_not_called()

    #tests the base class - no cookie -> 401
    def test_09_anonymous_is_401(self):
        self.assertEqual(APIClient().get(self.url).status_code, 401)


class FindActivitiesTests(ActivityTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("find_activities")

    #tests the param contract - trip and query are both required; a non-numeric trip is a 400 not a 500
    def test_01_requires_trip_and_query(self):
        self.assertEqual(self.client.get(self.url, {"trip": self.trip.id}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {"query": "pizza"}).status_code, 400)
        self.assertEqual(
            self.client.get(self.url, {"trip": "abc", "query": "pizza"}).status_code, 400
        )

    #tests the parent lookup - unknown trip -> 404
    def test_02_unknown_trip_is_404(self):
        resp = self.client.get(self.url, {"trip": 999, "query": "pizza"})
        self.assertEqual(resp.status_code, 404)

    #tests the center rule - a trip with no lodging cannot search (there is no center to bias to)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_03_no_lodging_is_400(self, mock_post):
        resp = self.client.get(self.url, {"trip": self.trip.id, "query": "pizza"})
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data, {"error": "Set where the group is staying first"})
        mock_post.assert_not_called()

    #tests the happy path - results come back as a list and the search is biased to the lodging's pin
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_04_search_is_centered_on_the_lodging(self, mock_post):
        make_lodging(self.trip)
        mock_post.return_value = mock_google(200, PLACES_RESULT)
        resp = self.client.get(
            self.url, {"trip": self.trip.id, "query": "pizza", "radius_m": 8047, "min_rating": 4}
        )
        with self.subTest():
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]["place_id"], "ChIJpizza")
        self.assertEqual(resp.data[0]["name"], "Pizza Place")
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body["textQuery"], "pizza")
        self.assertEqual(body["locationBias"]["circle"]["center"], {"latitude": 21.275, "longitude": -157.825})
        self.assertEqual(body["locationBias"]["circle"]["radius"], 8047.0)
        self.assertEqual(body["minRating"], 4.0)
        self.assertEqual(body["pageSize"], 10)                      #the default

    #tests the upstream-failure contract - google says no -> 502, not a 400 that blames the user
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_05_google_failure_is_502(self, mock_post):
        make_lodging(self.trip)
        mock_post.return_value = mock_google(403, {})
        resp = self.client.get(self.url, {"trip": self.trip.id, "query": "pizza"})
        self.assertEqual(resp.status_code, 502)
        self.assertEqual(resp.data, {"error": "Place search failed"})

    #tests the number guard - a non-numeric radius is a 400, not a ValueError 500
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_06_bad_numbers_are_400(self, mock_post):
        make_lodging(self.trip)
        resp = self.client.get(self.url, {"trip": self.trip.id, "query": "pizza", "radius_m": "far"})
        self.assertEqual(resp.status_code, 400)
        mock_post.assert_not_called()

    #tests the base class - no cookie -> 401
    def test_07_anonymous_is_401(self):
        resp = APIClient().get(self.url, {"trip": self.trip.id, "query": "pizza"})
        self.assertEqual(resp.status_code, 401)
