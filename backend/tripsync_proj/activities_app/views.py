from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as s
from rest_framework.permissions import IsAuthenticated

from trip_app.models import Trip
from .google_maps import geocode_address, search_places
from .models import Activity, ActivityGeocode, ActivityVote, Lodging
from .serializers import ActivitySerializer, LodgingSerializer

LOCATION_FIELDS = ["street", "city", "state", "zip", "country"]


class ActivityView(APIView):
    permission_classes = [IsAuthenticated]

    #helper - any activity by id for now (unknown ids answer 404)
    #TODO scope by trip__group__auth_user=request.user (group_app.Group M2M) - team decision, see Dependencies
    def retrieve_activity(self, request, id):
        return get_object_or_404(Activity.objects.select_related("geocode"), id=id)


class AllActivities(ActivityView):
    #endpoint: GET /api/v1/activities/?trip=<id>
    def get(self, request):
        trip_id = request.query_params.get("trip")
        if not trip_id or not trip_id.isdecimal():
            return Response(
                {"error": "trip query param is required"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        trip = get_object_or_404(Trip, id=trip_id)
        #select_related joins the geocode row in ONE query
        activities = Activity.objects.select_related("geocode").filter(trip=trip)
        serializer = ActivitySerializer(activities, many=True, context={"request": request})
        return Response(serializer.data)

    #endpoint: POST /api/v1/activities/
    def post(self, request):
        serializer = ActivitySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=s.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        #place_id rides in the body but is not a writable field ('' from a manual entry is falsy)
        place_id = request.data.get("place_id")
        has_location = bool(place_id) or any(data.get(field) for field in LOCATION_FIELDS)
        geo = None
        if has_location:
            #ask google BEFORE opening the transaction - never hold a DB connection on a network call
            geo = geocode_address(
                street=data.get("street", ""),
                city=data.get("city", ""),
                state=data.get("state", ""),
                zip_code=data.get("zip", ""),
                country=data.get("country", ""),
                place_id=place_id,
            )
            if not geo:
                return Response(
                    {"error": "Address could not be geocoded"},
                    status=s.HTTP_400_BAD_REQUEST,
                )
        #two rows, one request - all or nothing
        with transaction.atomic():
            #trip from the body, pin from google, never lat/lng from the client
            activity = serializer.save(place_id=geo.pop("place_id") if geo else "")
            if geo:
                ActivityGeocode.objects.create(activity=activity, **geo)
        return Response(
            ActivitySerializer(activity, context={"request": request}).data,
            status=s.HTTP_201_CREATED,
        )


class AnActivity(ActivityView):
    #endpoint: GET /api/v1/activities/<id>/
    def get(self, request, id):
        activity = self.retrieve_activity(request, id)
        serializer = ActivitySerializer(activity, context={"request": request})
        return Response(serializer.data)

    #endpoint: PUT /api/v1/activities/<id>/  (partial - one field is enough)
    def put(self, request, id):
        activity = self.retrieve_activity(request, id)
        serializer = ActivitySerializer(activity, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=s.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        #an activity belongs to its trip from birth - no re-parenting
        if "trip" in data and data["trip"] != activity.trip:
            return Response(
                {"error": "trip cannot be changed"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        location_changed = (
            any(field in data for field in LOCATION_FIELDS) or "place_id" in request.data
        )
        activity = serializer.save()
        if location_changed:
            place_id = request.data.get("place_id")
            has_location = bool(place_id) or any(
                getattr(activity, field) for field in LOCATION_FIELDS
            )
            if has_location:
                #location changed -> re-geocode; if google fails we keep the old pin
                geo = geocode_address(
                    street=activity.street,
                    city=activity.city,
                    state=activity.state,
                    zip_code=activity.zip,
                    country=activity.country,
                    place_id=place_id,
                )
                if geo:
                    activity.place_id = geo.pop("place_id")
                    activity.save(update_fields=["place_id", "updated_at"])
                    ActivityGeocode.objects.update_or_create(
                        activity=activity, defaults=geo
                    )
            else:
                #every location field blanked -> drop the pin so the map never shows a stale one
                ActivityGeocode.objects.filter(activity=activity).delete()
                activity.place_id = ""
                activity.save(update_fields=["place_id", "updated_at"])
        #re-read so the response carries the pin as the DB has it, not a cached copy
        activity = self.retrieve_activity(request, id)
        return Response(
            ActivitySerializer(activity, context={"request": request}).data,
            status=s.HTTP_200_OK,
        )

    #the frontend edits with PATCH; put is already partial, so PATCH is the same contract
    def patch(self, request, id):
        return self.put(request, id)

    #endpoint: DELETE /api/v1/activities/<id>/
    def delete(self, request, id):
        activity = self.retrieve_activity(request, id)
        activity.delete()
        return Response(None, status=s.HTTP_204_NO_CONTENT)


class AnActivityVote(ActivityView):
    #endpoint: POST /api/v1/activities/<id>/vote/
    def post(self, request, id):
        activity = self.retrieve_activity(request, id)
        vote, created = ActivityVote.objects.get_or_create(
            activity=activity, user=request.user
        )
        if not created:
            return Response(
                {"error": "You already voted for this activity."},
                status=s.HTTP_409_CONFLICT,
            )
        #201 carries the fresh activity so the client replaces its local vote arithmetic
        return Response(
            ActivitySerializer(activity, context={"request": request}).data,
            status=s.HTTP_201_CREATED,
        )

    #endpoint: DELETE /api/v1/activities/<id>/vote/
    def delete(self, request, id):
        activity = self.retrieve_activity(request, id)
        #scoped lookup - no vote of yours here answers 404
        vote = get_object_or_404(ActivityVote, activity=activity, user=request.user)
        vote.delete()
        return Response(None, status=s.HTTP_204_NO_CONTENT)


class ALodging(ActivityView):
    #endpoint: GET /api/v1/activities/lodging/<trip_id>/  (404 = not set yet; the frontend shows the form)
    def get(self, request, trip_id):
        lodging = get_object_or_404(Lodging, trip_id=trip_id)
        return Response(LodgingSerializer(lodging).data)

    #endpoint: PUT /api/v1/activities/lodging/<trip_id>/  (set or replace - always re-geocodes)
    def put(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        serializer = LodgingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=s.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        place_id = request.data.get("place_id")
        if not (place_id or any(data.get(field) for field in LOCATION_FIELDS)):
            return Response(
                {"error": "Provide a place_id or an address"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        #ask google BEFORE any write - a lodging without a pin is useless, so failure is a 400 and no row
        geo = geocode_address(
            street=data.get("street", ""),
            city=data.get("city", ""),
            state=data.get("state", ""),
            zip_code=data.get("zip", ""),
            country=data.get("country", ""),
            place_id=place_id,
        )
        if not geo:
            return Response(
                {"error": "Address could not be geocoded"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        #one row per trip - replace means every field, so an address field not sent goes back to ''
        fields = {"name": data.get("name", "")}
        fields.update({field: data.get(field, "") for field in LOCATION_FIELDS})
        fields.update(geo)
        lodging, created = Lodging.objects.update_or_create(trip=trip, defaults=fields)
        return Response(
            LodgingSerializer(lodging).data,
            status=s.HTTP_201_CREATED if created else s.HTTP_200_OK,
        )

    #endpoint: DELETE /api/v1/activities/lodging/<trip_id>/
    def delete(self, request, trip_id):
        lodging = get_object_or_404(Lodging, trip_id=trip_id)
        lodging.delete()
        return Response(None, status=s.HTTP_204_NO_CONTENT)


class FindActivities(ActivityView):
    #endpoint: GET /api/v1/activities/search/?trip=<id>&query=<text>[&radius_m=5000][&min_rating=4][&max_results=10]
    def get(self, request):
        trip_id = request.query_params.get("trip")
        query = request.query_params.get("query", "").strip()
        if not trip_id or not trip_id.isdecimal() or not query:
            return Response(
                {"error": "trip and query params are required"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        trip = get_object_or_404(Trip, id=trip_id)
        #the lodging is the center of the search - no lodging, no search
        lodging = Lodging.objects.filter(trip=trip).first()
        if lodging is None:
            return Response(
                {"error": "Set where the group is staying first"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        try:
            radius_m = float(request.query_params.get("radius_m", 5000))
            max_results = int(request.query_params.get("max_results", 10))
            min_rating = request.query_params.get("min_rating")
            min_rating = float(min_rating) if min_rating else None
        except ValueError:
            return Response(
                {"error": "radius_m, min_rating and max_results must be numbers"},
                status=s.HTTP_400_BAD_REQUEST,
            )
        places = search_places(
            query,
            latitude=lodging.latitude,
            longitude=lodging.longitude,
            radius_m=radius_m,
            min_rating=min_rating,
            max_results=max_results,
        )
        if places is None:
            #upstream failed - 502 says "google, not you"; CJs's 400 vocabulary would blame the client
            return Response({"error": "Place search failed"}, status=s.HTTP_502_BAD_GATEWAY)
        return Response(places)
