from django.urls import path


from .views import *

urlpatterns = [
    path("trips/<trip_id:int>/", TripById.as_view(), name="trip_by_id")
]