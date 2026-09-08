from django.urls import path


from .views import *
# Get view from group_app
from group_app.views import AllUserGroups

urlpatterns = [
    path("signup/", Sign_Up.as_view(), name="signup"),
    path("login/", Log_in.as_view(), name="login"),
    path("logout/", Log_out.as_view(), name="logout"),
    path("info/", Info.as_view(), name="info"),
    path("token/refresh/", TokenRefresh.as_view(), name="token_refresh"),

    # Imported View from group_app
    path("groups/", AllUserGroups.as_view(), name="list_user_groups")
]