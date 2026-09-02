from django.urls import path

from .views import ActivityDeleteView, ActivityListCreateView, ActivityVoteView

app_name = "activities_app"

urlpatterns = [
    path(
        "trips/<int:trip_id>/activities/",
        ActivityListCreateView.as_view(),
        name="activity-list-create",
    ),
    path(
        "trips/<int:trip_id>/activities/<int:activity_id>/",
        ActivityDeleteView.as_view(),
        name="activity-delete",
    ),
    path(
        "trips/<int:trip_id>/activities/<int:activity_id>/vote/",
        ActivityVoteView.as_view(),
        name="activity-vote",
    ),
]
