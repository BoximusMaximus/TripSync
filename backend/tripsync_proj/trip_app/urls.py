from django.urls import path


from .views import *

urlpatterns = [
    path("trips/create/", CreateTrip.as_view(), name="create_new_trip"),
    path("trips/<int:trip_id>/", TripById.as_view(), name="trip_by_id")
]