from time import time
from unittest.mock import patch

from django.conf import settings
from django.conf.urls import url
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, override_settings
from exam import fixture
from freezegun import freeze_time
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from sentry.api.base import Endpoint
from sentry.api.endpoints.organization_group_index import OrganizationGroupIndexEndpoint
from sentry.middleware.ratelimit import (
    RatelimitMiddleware,
    get_rate_limit_key,
    get_rate_limit_value,
)
from sentry.models import ApiKey, ApiToken, SentryAppInstallation, User
from sentry.testutils import APITestCase, TestCase
from sentry.types.ratelimit import RateLimit, RateLimitCategory


class RatelimitMiddlewareTest(TestCase):
    middleware = fixture(RatelimitMiddleware)
    factory = fixture(RequestFactory)

    class TestEndpoint(Endpoint):
        def get(self):
            return Response({"ok": True})

    _test_endpoint = TestEndpoint.as_view()

    def populate_sentry_app_request(self, request):
        sentry_app = self.create_sentry_app(
            name="Bubbly Webhook",
            organization=self.organization,
            webhook_url="https://example.com",
            scopes=["event:write"],
        )

        internal_integration = self.create_internal_integration(
            name="my_app",
            organization=self.organization,
            scopes=("project:read",),
            webhook_url="http://example.com",
        )
        # there should only be one record created so just grab the first one
        install = SentryAppInstallation.objects.get(
            sentry_app=internal_integration.id, organization=self.organization
        )
        token = install.api_token

        request.user = User.objects.get(id=sentry_app.proxy_user_id)
        request.auth = token

    @patch("sentry.middleware.ratelimit.get_rate_limit_value")
    def test_positive_rate_limit_check(self, default_rate_limit_mock):
        request = self.factory.get("/")
        with freeze_time("2000-01-01"):
            default_rate_limit_mock.return_value = RateLimit(0, 100)
            self.middleware.process_view(request, self._test_endpoint, [], {})
            assert request.will_be_rate_limited

        with freeze_time("2000-01-02"):
            # 10th request in a 10 request window should get rate limited
            default_rate_limit_mock.return_value = RateLimit(10, 100)
            for _ in range(10):
                self.middleware.process_view(request, self._test_endpoint, [], {})
                assert not request.will_be_rate_limited

            self.middleware.process_view(request, self._test_endpoint, [], {})
            assert request.will_be_rate_limited

    @patch("sentry.middleware.ratelimit.get_rate_limit_value")
    def test_negative_rate_limit_check(self, default_rate_limit_mock):
        request = self.factory.get("/")
        default_rate_limit_mock.return_value = RateLimit(10, 100)
        self.middleware.process_view(request, self._test_endpoint, [], {})
        assert not request.will_be_rate_limited

        # Requests outside the current window should not be rate limited
        default_rate_limit_mock.return_value = RateLimit(1, 1)
        with freeze_time("2000-01-01") as frozen_time:
            self.middleware.process_view(request, self._test_endpoint, [], {})
            assert not request.will_be_rate_limited
            frozen_time.tick(1)
            self.middleware.process_view(request, self._test_endpoint, [], {})
            assert not request.will_be_rate_limited

    def test_rate_limit_category(self):
        request = self.factory.get("/")
        request.META["REMOTE_ADDR"] = None
        self.middleware.process_view(request, self._test_endpoint, [], {})
        assert request.rate_limit_category is None

        request = self.factory.get("/")
        self.middleware.process_view(request, self._test_endpoint, [], {})
        assert request.rate_limit_category == "ip"

        request.session = {}
        request.user = self.user
        self.middleware.process_view(request, self._test_endpoint, [], {})
        assert request.rate_limit_category == "user"

        self.populate_sentry_app_request(request)
        self.middleware.process_view(request, self._test_endpoint, [], {})
        assert request.rate_limit_category == "org"

    def test_get_rate_limit_key(self):
        # Import an endpoint

        view = OrganizationGroupIndexEndpoint

        # Test for default IP
        request = self.factory.get("/")
        assert (
            get_rate_limit_key(view, request) == "ip:OrganizationGroupIndexEndpoint:GET:127.0.0.1"
        )
        # Test when IP address is missing
        request.META["REMOTE_ADDR"] = None
        assert get_rate_limit_key(view, request) is None

        # Test when IP addess is IPv6
        request.META["REMOTE_ADDR"] = "684D:1111:222:3333:4444:5555:6:77"
        assert (
            get_rate_limit_key(view, request)
            == "ip:OrganizationGroupIndexEndpoint:GET:684D:1111:222:3333:4444:5555:6:77"
        )

        # Test for users
        request.session = {}
        request.user = self.user
        assert (
            get_rate_limit_key(view, request)
            == f"user:OrganizationGroupIndexEndpoint:GET:{self.user.id}"
        )

        # Test for user auth tokens
        token = ApiToken.objects.create(user=self.user, scope_list=["event:read", "org:read"])
        request.auth = token
        request.user = self.user
        assert (
            get_rate_limit_key(view, request)
            == f"user:OrganizationGroupIndexEndpoint:GET:{self.user.id}"
        )

        # Test for sentryapp auth tokens:
        self.populate_sentry_app_request(request)
        assert (
            get_rate_limit_key(view, request)
            == f"org:OrganizationGroupIndexEndpoint:GET:{self.organization.id}"
        )

        # Test for apikey
        api_key = ApiKey.objects.create(
            organization=self.organization, scope_list=["project:write"]
        )
        request.user = AnonymousUser()
        request.auth = api_key
        assert (
            get_rate_limit_key(view, request)
            == "ip:OrganizationGroupIndexEndpoint:GET:684D:1111:222:3333:4444:5555:6:77"
        )


class TestGetRateLimitValue(TestCase):
    def test_default_rate_limit_values(self):
        """Ensure that the default rate limits are called for endpoints without overrides"""

        class TestEndpoint(Endpoint):
            pass

        assert (
            get_rate_limit_value("GET", TestEndpoint, "ip")
            == settings.SENTRY_RATELIMITER_DEFAULTS["ip"]
        )
        assert (
            get_rate_limit_value("POST", TestEndpoint, "org")
            == settings.SENTRY_RATELIMITER_DEFAULTS["org"]
        )
        assert (
            get_rate_limit_value("DELETE", TestEndpoint, "user")
            == settings.SENTRY_RATELIMITER_DEFAULTS["user"]
        )

    def test_override_rate_limit(self):
        """Override one or more of the default rate limits"""

        class TestEndpoint(Endpoint):
            rate_limits = {
                "GET": {RateLimitCategory.IP: RateLimit(100, 5)},
                "POST": {RateLimitCategory.USER: RateLimit(20, 4)},
            }

        assert get_rate_limit_value("GET", TestEndpoint, "ip") == RateLimit(100, 5)
        assert (
            get_rate_limit_value("GET", TestEndpoint, "user")
            == settings.SENTRY_RATELIMITER_DEFAULTS["user"]
        )
        assert (
            get_rate_limit_value("POST", TestEndpoint, "ip")
            == settings.SENTRY_RATELIMITER_DEFAULTS["ip"]
        )
        assert get_rate_limit_value("POST", TestEndpoint, "user") == RateLimit(20, 4)

    def test_non_endpoint(self):
        """views that don't inherit Endpoint shouldn not return a value"""

        class TestEndpoint:
            pass

        assert get_rate_limit_value("GET", TestEndpoint, "ip") is None


class RateLimitHeaderTestEndpoint(Endpoint):
    permission_classes = (AllowAny,)

    enforce_rate_limit = True
    rate_limits = {"GET": {RateLimitCategory.IP: RateLimit(2, 100)}}

    def get(self, request):
        return Response({"ok": True})


urlpatterns = [
    url(r"^/ratelimit$", RateLimitHeaderTestEndpoint.as_view(), name="ratelimit-header-endpoint")
]


@override_settings(ROOT_URLCONF="tests.sentry.middleware.test_ratelimit_middleware")
class TestRatelimitHeader(APITestCase):

    endpoint = "ratelimit-header-endpoint"

    def test_header_counts(self):
        """Ensure that the header remainder counts decrease properly"""
        with freeze_time("2000-01-01"):
            expected_reset_time = int(time() + 100)
            response = self.get_success_response()
            assert int(response["X-Sentry-Rate-Limit-Remaining"]) == 1
            assert int(response["X-Sentry-Rate-Limit-Limit"]) == 2
            assert int(response["X-Sentry-Rate-Limit-Reset"]) == expected_reset_time

            response = self.get_success_response()
            assert int(response["X-Sentry-Rate-Limit-Remaining"]) == 0
            assert int(response["X-Sentry-Rate-Limit-Limit"]) == 2
            assert int(response["X-Sentry-Rate-Limit-Reset"]) == expected_reset_time

            response = self.get_error_response()
            assert int(response["X-Sentry-Rate-Limit-Remaining"]) == 0
            assert int(response["X-Sentry-Rate-Limit-Limit"]) == 2
            assert int(response["X-Sentry-Rate-Limit-Reset"]) == expected_reset_time

            response = self.get_error_response()
            assert int(response["X-Sentry-Rate-Limit-Remaining"]) == 0
            assert int(response["X-Sentry-Rate-Limit-Limit"]) == 2
            assert int(response["X-Sentry-Rate-Limit-Reset"]) == expected_reset_time

    @patch("sentry.ratelimits.utils.can_be_ratelimited")
    def test_omit_header(self, can_be_ratelimited_patch):
        """
        Ensure that functions that can't be rate limited don't have rate limit headers

        These functions include, but are not limited to:
            - UI Statistics Endpoints
            - Endpoints that don't inherit api.base.Endpoint
        """
        can_be_ratelimited_patch.return_value = False
        response = self.get_response()
        assert "X-Sentry-Rate-Limit-Remaining" not in response._headers
        assert "X-Sentry-Rate-Limit-Limit" not in response._headers
        assert "X-Sentry-Rate-Limit-Reset" not in response._headers
