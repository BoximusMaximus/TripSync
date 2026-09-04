from django.urls import path


from .views import *

urlpatterns = [
    path("groups/create/", CreateGroup.as_view(), name="create_new_group"),
    path("groups/<int:group_id>/", GroupById.as_view(), name="group_by_id"),
    path("groups/trip/<int:trip_id>/", GroupByTripId.as_view(), name="group_by_trip_id"),
]