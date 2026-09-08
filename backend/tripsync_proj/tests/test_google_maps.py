import os
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from activities_app.google_maps import geocode_address, search_places

GOOGLE_ENV = {"GOOGLE_MAPS_SERVER_KEY": "test-key"}

#the CJs stub - a tiny class plays google; status_code because the helper checks it
def mock_google(status_code, payload):
    return type(
        "MockResponse", (), {"status_code": status_code, "json": lambda self: payload}
    )()


class GeocodeAddressTests(TestCase):

    #tests the failure contract - google says no -> None, not an exception
        # this is why a bad address is a 400 and not a 500. mock swaps requests.get so we never hit google
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_01_google_failure_returns_none(self, mock_get):
        mock_get.return_value = mock_google(403, {})
        result = geocode_address(
            street="933 Kapahulu Ave", city="Honolulu", state="HI",
            zip_code="96816", country="United States",
        )
        self.assertIsNone(result)

    #tests the empty-address guard - nothing to geocode -> None and google is never called
        # the view uses this so an activity with no location costs zero google calls
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_02_empty_address_never_calls_google(self, mock_get):
        self.assertIsNone(geocode_address())
        mock_get.assert_not_called()

    #tests the manual branch - v4 'results' wrapper is parsed and the text is percent-encoded
        # 'Paris, France' is a legitimate travel entry with no street; the comma must not split the URL path
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_03_manual_entry_parses_results_wrapper(self, mock_get):
        mock_get.return_value = mock_google(200, {"results": [{
            "placeId": "ChIJparis",
            "location": {"latitude": 48.856614, "longitude": 2.352222},
            "formattedAddress": "Paris, France",
        }]})
        result = geocode_address(city="Paris", country="France")
        self.assertEqual(result["place_id"], "ChIJparis")
        self.assertEqual(result["latitude"], 48.856614)
        called_url = mock_get.call_args.args[0]
        self.assertTrue(called_url.endswith("/v4/geocode/address/Paris%2C%20France"))
        self.assertNotIn("regionCode", mock_get.call_args.kwargs["params"])

    #tests the place branch - bare object, no wrapper, and the id goes in the URL path
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_04_place_id_parses_bare_object(self, mock_get):
        mock_get.return_value = mock_google(200, {
            "placeId": "ChIJplace",
            "location": {"latitude": 21.284, "longitude": -157.812},
            "formattedAddress": "933 Kapahulu Ave, Honolulu, HI 96816, USA",
        })
        result = geocode_address(place_id="ChIJplace")
        self.assertEqual(result["place_id"], "ChIJplace")
        self.assertTrue(mock_get.call_args.args[0].endswith("/v4/geocode/places/ChIJplace"))

    #tests the two-letter country -> regionCode bias
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.get")
    def test_05_two_letter_country_becomes_region_bias(self, mock_get):
        mock_get.return_value = mock_google(200, {"results": []})
        self.assertIsNone(geocode_address(city="Honolulu", country="us"))   #empty results -> None
        self.assertEqual(mock_get.call_args.kwargs["params"], {"regionCode": "US"})

    #tests the loud misconfig - no key -> KeyError, never a silent 'could not be geocoded' 400
    def test_06_missing_key_is_loud(self):
        with patch.dict("os.environ"):            #snapshot; restored on exit
            os.environ.pop("GOOGLE_MAPS_SERVER_KEY", None)
            with self.assertRaises(KeyError):
                geocode_address(city="Honolulu")

    #tests the empty-value case - 'GOOGLE_MAPS_SERVER_KEY=' straight from .env.example must also be loud
    @patch.dict("os.environ", {"GOOGLE_MAPS_SERVER_KEY": ""})
    def test_07_empty_key_is_loud(self):
        with self.assertRaises(KeyError):
            geocode_address(city="Honolulu")


class SearchPlacesTests(TestCase):

    #tests the happy path - places (new) shape is parsed, and the body carries the lodging as the bias center
        # the Decimal inputs are what the Lodging row hands over; google wants floats
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_01_parses_places_and_biases_to_center(self, mock_post):
        mock_post.return_value = mock_google(200, {"places": [{
            "id": "ChIJpizza",
            "displayName": {"text": "Pizza Place", "languageCode": "en"},
            "formattedAddress": "1 Pizza St, Honolulu, HI 96815, USA",
            "location": {"latitude": 21.28, "longitude": -157.83},
        }]})
        result = search_places(
            "pizza", latitude=Decimal("21.275000"), longitude=Decimal("-157.825000"),
            radius_m=8047, min_rating=4, max_results=5,
        )
        self.assertEqual(result, [{
            "place_id": "ChIJpizza",
            "name": "Pizza Place",
            "formatted_address": "1 Pizza St, Honolulu, HI 96815, USA",
            "latitude": 21.28,
            "longitude": -157.83,
        }])
        self.assertEqual(mock_post.call_args.args[0], "https://places.googleapis.com/v1/places:searchText")
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body["textQuery"], "pizza")
        self.assertEqual(body["pageSize"], 5)
        self.assertEqual(body["minRating"], 4.0)
        self.assertEqual(body["locationBias"]["circle"]["center"], {"latitude": 21.275, "longitude": -157.825})
        self.assertEqual(body["locationBias"]["circle"]["radius"], 8047.0)
        self.assertIn("X-Goog-FieldMask", mock_post.call_args.kwargs["headers"])

    #tests the clamps - google rejects more than 20 results or more than 50 km; clamp, don't 400 the user
        # and no minRating key at all when none was asked for (google would reject null)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_02_clamps_page_size_and_radius(self, mock_post):
        mock_post.return_value = mock_google(200, {"places": []})
        self.assertEqual(search_places("x", 21.0, -157.0, radius_m=99999, max_results=99), [])
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body["pageSize"], 20)
        self.assertEqual(body["locationBias"]["circle"]["radius"], 50000.0)
        self.assertNotIn("minRating", body)

    #tests the failure contract - google says no -> None, not an exception (the view turns it into a 502)
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_03_google_failure_returns_none(self, mock_post):
        mock_post.return_value = mock_google(403, {})
        self.assertIsNone(search_places("pizza", 21.0, -157.0))

    #tests a malformed hit - a place with no location -> None, never a 500
    @patch.dict("os.environ", GOOGLE_ENV)
    @patch("requests.post")
    def test_04_malformed_place_returns_none(self, mock_post):
        mock_post.return_value = mock_google(200, {"places": [{"id": "ChIJx", "location": None}]})
        self.assertIsNone(search_places("pizza", 21.0, -157.0))

    #tests the loud misconfig - the search helper shares the key check with geocoding
    @patch.dict("os.environ", {"GOOGLE_MAPS_SERVER_KEY": ""})
    def test_05_empty_key_is_loud(self):
        with self.assertRaises(KeyError):
            search_places("pizza", 21.0, -157.0)
