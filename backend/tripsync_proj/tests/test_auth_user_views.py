from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse, reverse_lazy
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

Auth_User = get_user_model()


class UnthrottledAPITestCase(APITestCase):
    """
    Throttling is shared (by IP) across every anon-facing call in a test run,
    so back-to-back tests can trip DEFAULT_THROTTLE_RATES well before any
    single test does anything wrong. These tests aren't exercising throttling
    behavior, so it's disabled here rather than left to interfere
    nondeterministically.

    Note: overriding settings.REST_FRAMEWORK does *not* work for this — DRF
    views bind `throttle_classes` from api_settings once at import time, so a
    runtime settings override never reaches already-defined view classes
    (ours or simplejwt's built-in TokenRefreshView). Patching the throttle
    check itself is what actually disables it.
    """
    # ^ What the AI is TRYING to say is: The test dont work because we have 
    # throttling enabled so it did some black magic (below) to bypass the throttle

    def setUp(self):
        super().setUp()
        patcher = patch(
            "rest_framework.throttling.SimpleRateThrottle.allow_request",
            return_value=True,
        )
        patcher.start()
        self.addCleanup(patcher.stop)


class SignUpTests(UnthrottledAPITestCase):
    url = reverse_lazy("signup")

    def test_signup_creates_user_and_returns_tokens(self):
        response = self.client.post(
            self.url,
            {
                "username": "new_user",
                "email": "new_user@example.com",
                "password": "a-strong-password-1",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["client"], "new_user")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        user = Auth_User.objects.get(username="new_user")
        self.assertEqual(user.email, "new_user@example.com")
        self.assertTrue(user.check_password("a-strong-password-1"))

    def test_signup_rejects_invalid_username(self):
        response = self.client.post(
            self.url,
            {
                "username": "n",
                "email": "new_user@example.com",
                "password": "a-strong-password-1",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)
        self.assertFalse(Auth_User.objects.filter(email="new_user@example.com").exists())

    def test_signup_rejects_invalid_email(self):
        response = self.client.post(
            self.url,
            {
                "username": "new_user",
                "email": "not-an-email",
                "password": "a-strong-password-1",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_signup_rejects_duplicate_username(self):
        Auth_User.objects.create_user(
            username="taken",
            email="first@example.com",
            password="a-strong-password-1",
        )

        response = self.client.post(
            self.url,
            {
                "username": "taken",
                "email": "second@example.com",
                "password": "a-strong-password-1",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_signup_rejects_duplicate_email(self):
        Auth_User.objects.create_user(
            username="first_user",
            email="taken@example.com",
            password="a-strong-password-1",
        )

        response = self.client.post(
            self.url,
            {
                "username": "second_user",
                "email": "taken@example.com",
                "password": "a-strong-password-1",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)


class LogInTests(UnthrottledAPITestCase):
    url = reverse_lazy("login")

    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="existing_user",
            email="existing_user@example.com",
            password="a-strong-password-1",
        )

    def test_login_with_correct_credentials_returns_tokens(self):
        response = self.client.post(
            self.url,
            {"username": "existing_user", "password": "a-strong-password-1"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["client"], "existing_user")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_wrong_password_is_unauthorized(self):
        response = self.client.post(
            self.url,
            {"username": "existing_user", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_unknown_username_is_unauthorized(self):
        response = self.client.post(
            self.url,
            {"username": "nobody", "password": "a-strong-password-1"},
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InfoTests(UnthrottledAPITestCase):
    url = reverse_lazy("info")

    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="existing_user",
            email="existing_user@example.com",
            password="a-strong-password-1",
        )

    def _authenticate(self):
        access = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_info_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_info_returns_current_user(self):
        self._authenticate()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "existing_user")
        self.assertEqual(response.data["email"], "existing_user@example.com")
        self.assertEqual(response.data["id"], self.user.id)


class LogOutTests(UnthrottledAPITestCase):
    url = reverse_lazy("logout")

    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="existing_user",
            email="existing_user@example.com",
            password="a-strong-password-1",
        )

    def _authenticate(self):
        refresh = RefreshToken.for_user(self.user)
        access = refresh.access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        return refresh

    def test_logout_requires_authentication(self):
        response = self.client.post(self.url, {"refresh": "irrelevant"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_refresh_token_is_bad_request(self):
        self._authenticate()

        response = self.client.post(self.url, {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_with_invalid_refresh_token_is_bad_request(self):
        self._authenticate()

        response = self.client.post(self.url, {"refresh": "not-a-real-token"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_logout_blacklists_refresh_token(self):
        refresh = self._authenticate()

        response = self.client.post(self.url, {"refresh": str(refresh)})
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # The blacklisted refresh token can no longer be used to get a new access token.
        refresh_response = self.client.post(
            reverse("token_refresh"), {"refresh": str(refresh)}
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshTests(UnthrottledAPITestCase):
    url = reverse_lazy("token_refresh")

    def setUp(self):
        super().setUp()
        self.user = Auth_User.objects.create_user(
            username="existing_user",
            email="existing_user@example.com",
            password="a-strong-password-1",
        )

    def test_refresh_with_valid_token_returns_new_access_token(self):
        refresh = RefreshToken.for_user(self.user)

        response = self.client.post(self.url, {"refresh": str(refresh)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_refresh_with_invalid_token_is_unauthorized(self):
        response = self.client.post(self.url, {"refresh": "not-a-real-token"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
