from django.utils.deprecation import MiddlewareMixin
from sudo.middleware import SudoMiddleware as BaseSudoMiddleware


class SudoMiddleware(MiddlewareMixin, BaseSudoMiddleware):
    def has_sudo_privileges(self, request):
        # Users without a password are assumed to always have sudo powers
        user = request.user
        if user.is_authenticated and not user.has_usable_password():
            return True

        return super().has_sudo_privileges(request)
