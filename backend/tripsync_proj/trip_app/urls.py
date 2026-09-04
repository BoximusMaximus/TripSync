from django.urls import path


from .views import *

urlpatterns = [
    path("create/", CreateTrip.as_view(), name="create_new_trip"),
    path("<int:trip_id>/", TripById.as_view(), name="trip_by_id")
]