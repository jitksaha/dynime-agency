"""
dynime_middlewares.py

This module is used to register dynime's middlewares without affecting the dynime/settings.py
"""

import threading

from django.http import HttpResponseNotAllowed
from django.shortcuts import render

from dynime.settings import MIDDLEWARE

MIDDLEWARE.insert(0, "dynime.dynime_middlewares.HrmSubpathMiddleware")
MIDDLEWARE.append("base.middleware.CompanyMiddleware")
MIDDLEWARE.append("dynime.dynime_middlewares.MethodNotAllowedMiddleware")
MIDDLEWARE.append("dynime.dynime_middlewares.ThreadLocalMiddleware")
MIDDLEWARE.append("dynime.dynime_middlewares.SVGSecurityMiddleware")
MIDDLEWARE.append("accessibility.middlewares.AccessibilityMiddleware")
MIDDLEWARE.append("accessibility.middlewares.AccessibilityMiddleware")
MIDDLEWARE.append("base.middleware.ForcePasswordChangeMiddleware")
MIDDLEWARE.append("base.middleware.TwoFactorAuthMiddleware")
_thread_locals = threading.local()


class ThreadLocalMiddleware:
    """
    ThreadLocalMiddleWare
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        response = self.get_response(request)
        return response


class MethodNotAllowedMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if isinstance(response, HttpResponseNotAllowed):
            return render(request, "405.html")
        return response


class SVGSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Apply security headers to SVG files
        if request.path.endswith(".svg") and response.status_code == 200:
            response["Content-Security-Policy"] = (
                "default-src 'none'; style-src 'unsafe-inline';"
            )
            response["X-Content-Type-Options"] = "nosniff"

        return response


class HrmSubpathMiddleware:
    """
    Middleware to strip /hrm subpath prefix from request.path_info
    to allow relative Django routing under a script name directory.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/hrm"):
            request.path = request.path[4:]
            if not request.path.startswith("/"):
                request.path = "/" + request.path
        if request.path_info.startswith("/hrm"):
            request.path_info = request.path_info[4:]
            if not request.path_info.startswith("/"):
                request.path_info = "/" + request.path_info
        return self.get_response(request)
