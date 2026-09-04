from django.urls import path


from .views import *

urlpatterns = [
    path("trips/<int:trip_id>/", TripById.as_view(), name="trip_by_id")
]