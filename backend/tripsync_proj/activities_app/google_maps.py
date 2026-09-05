import os
from urllib.parse import quote

import requests

GEOCODE_PLACE_URL = "https://geocode.googleapis.com/v4/geocode/places/{place_id}"
GEOCODE_ADDRESS_URL = "https://geocode.googleapis.com/v4/geocode/address/{address}"
PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def _api_key():
    #outside every try on purpose: a missing OR EMPTY key is a deploy bug and must be loud, not a 400
    api_key = os.environ["GOOGLE_MAPS_SERVER_KEY"]
    if not api_key:
        raise KeyError("GOOGLE_MAPS_SERVER_KEY is set but empty - fill it in backend/.env")
    return api_key


#not an endpoint - a step inside lodging PUT and activity create/update; nothing routes here
def geocode_address(street="", city="", state="", zip_code="", country="", place_id=None):
    api_key = _api_key()
    try:
        if place_id:
            #exact lookup - the Places pick identified the place; response is ONE object
            resp = requests.get(
                GEOCODE_PLACE_URL.format(place_id=place_id),
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "location,formattedAddress,placeId",
                },
                timeout=5,
            )
            if resp.status_code != 200:
                return None
            result = resp.json()
        else:
            #manual entry - google parses one free-text line; response is {"results": [...]}
            parts = [part for part in (street, city, state, zip_code, country) if part]
            if not parts:
                return None
            text = ", ".join(parts)
            params = {}
            if len(country) == 2 and country.isalpha():
                #bias only - v4 never hard-filters on region
                params["regionCode"] = country.upper()
            resp = requests.get(
                GEOCODE_ADDRESS_URL.format(address=quote(text, safe="")),
                params=params,
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "results.location,results.formattedAddress,results.placeId",
                },
                timeout=5,
            )
            if resp.status_code != 200:
                return None
            results = resp.json().get("results", [])
            if not results:
                return None
            result = results[0]
        return {
            "latitude": result["location"]["latitude"],
            "longitude": result["location"]["longitude"],
            "formatted_address": result.get("formattedAddress", ""),
            "place_id": result.get("placeId", ""),
        }
    except (requests.RequestException, KeyError, TypeError, ValueError):
        #failure is a value, not a crash - the view turns None into a 400
        return None


#not an endpoint - called by FindActivities; returns a list (maybe empty) or None on failure
def search_places(query, latitude, longitude, radius_m=5000, min_rating=None, max_results=10):
    api_key = _api_key()
    try:
        body = {
            "textQuery": query,
            #google caps a page at 20 - clamp instead of 400ing the user
            "pageSize": max(1, min(int(max_results), 20)),
            #bias, not a fence - a strong match outside the circle can still come back
            "locationBias": {
                "circle": {
                    "center": {"latitude": float(latitude), "longitude": float(longitude)},
                    "radius": max(0.0, min(float(radius_m), 50000.0)),   #metres; google caps at 50 km
                }
            },
        }
        if min_rating is not None:
            body["minRating"] = float(min_rating)   #0.0-5.0 in 0.5 steps; google rounds UP
        resp = requests.post(
            PLACES_SEARCH_URL,
            json=body,
            headers={
                "X-Goog-Api-Key": api_key,
                #REQUIRED on Places (New) - omitting it is an error, not "all fields"
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
            },
            timeout=5,
        )
        if resp.status_code != 200:
            return None
        return [
            {
                "place_id": place["id"],
                "name": place.get("displayName", {}).get("text", ""),   #displayName is {text, languageCode}
                "formatted_address": place.get("formattedAddress", ""),
                "latitude": place["location"]["latitude"],
                "longitude": place["location"]["longitude"],
            }
            for place in resp.json().get("places", [])
        ]
    except (requests.RequestException, KeyError, TypeError, ValueError):
        #failure is a value, not a crash - the view turns None into a 502
        return None
