from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import *

urlpatterns = [
    path("signup/", Sign_Up.as_view(), name="signup"),
    path("login/", Log_in.as_view(), name="login"),
    path("logout/", Log_out.as_view(), name="logout"),
    path("info/", Info.as_view(), name="info"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]