from django.urls import path
from .views import ALodging, AllActivities, AnActivity, AnActivityVote, FindActivities

urlpatterns = [
    path("", AllActivities.as_view(), name="all_activities"),
    #static routes ABOVE '<int:id>/' - patterns are tried top to bottom
    path("search/", FindActivities.as_view(), name="find_activities"),
    path("lodging/<int:trip_id>/", ALodging.as_view(), name="a_lodging"),
    path("<int:id>/", AnActivity.as_view(), name="an_activity"),
    path("<int:id>/vote/", AnActivityVote.as_view(), name="activity_vote"),
]
