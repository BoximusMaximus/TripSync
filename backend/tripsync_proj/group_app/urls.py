from django.urls import path


from .views import *

urlpatterns = [
    path("create/", CreateGroup.as_view(), name="create_new_group"),
    path("<int:group_id>/", GroupById.as_view(), name="group_by_id"),
    path("trip/<int:trip_id>/", GroupByTripId.as_view(), name="group_by_trip_id"),
]