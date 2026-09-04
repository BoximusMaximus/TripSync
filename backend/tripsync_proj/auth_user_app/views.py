from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from django.conf import settings


from .serializers import AuthUserSerializer

Auth_User = get_user_model()


# Helper function adding cookies with access and refresh token.
def add_tokens_to_cookie(response, refresh_token):
    response.set_cookie(
        "access_token",
        str(refresh_token.access_token),
        max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    response.set_cookie(
        "refresh_token",
        str(refresh_token),
        max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    return response


# Helper function to kill cookies and their family
def clear_auth_cookies(response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


# Create your views here.
class Sign_Up(APIView):
    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        serializer = AuthUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_user_inst = Auth_User.objects.create_user(
            username=serializer.validated_data["username"],
            email=serializer.validated_data["email"],
            password=request.data.get("password"),
        )

        refresh = RefreshToken.for_user(new_user_inst)

        response = Response(
            {"client": new_user_inst.username},
            status=status.HTTP_201_CREATED,
        )

        return add_tokens_to_cookie(response, refresh)


class Log_in(APIView):

    @method_decorator(ensure_csrf_cookie)
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(
            username=username,
            password=password,
        )

        if not user:
            return Response(
                "Invalid credentials",
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        response = Response(
            {"client": user.username},
            status=status.HTTP_200_OK,
        )

        return add_tokens_to_cookie(response, refresh)


class Log_out(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return clear_auth_cookies(
                Response(
                    {"detail": '"refresh" token is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            )

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return clear_auth_cookies(
                Response(
                    {"detail": "Invalid or expired refresh token."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            )

        return clear_auth_cookies(Response(status=status.HTTP_204_NO_CONTENT))


class Info(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = AuthUserSerializer(request.user)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class TokenRefresh(APIView):
    def post(self, request):
        raw_refresh = request.COOKIES.get("refresh_token")
        if not raw_refresh:
            return Response(
                {"detail": '"refresh" token is required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(status=status.HTTP_200_OK)
        return add_tokens_to_cookie(response, refresh)
