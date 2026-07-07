from django.apps import AppConfig
from django.conf import settings

import dynime.dynime_settings


class HorillaLdapConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dynime_ldap"

    def ready(self):
        from django.urls import include, path

        from dynime.dynime_settings import APPS
        from dynime.urls import urlpatterns

        APPS.append("dynime_ldap")
        urlpatterns.append(
            path("", include("dynime_ldap.urls")),
        )
        super().ready()

        ldap_config = dynime.dynime_settings.load_ldap_settings()

        # Apply settings dynamically
        settings.LDAP_SERVER = ldap_config["LDAP_SERVER"]
        settings.BIND_DN = ldap_config["BIND_DN"]
        settings.BIND_PASSWORD = ldap_config["BIND_PASSWORD"]
        settings.BASE_DN = ldap_config["BASE_DN"]

        settings.AUTH_LDAP_SERVER_URI = settings.LDAP_SERVER
        settings.AUTH_LDAP_BIND_DN = settings.BIND_DN
        settings.AUTH_LDAP_BIND_PASSWORD = settings.BIND_PASSWORD
        settings.AUTH_LDAP_USER_SEARCH_BASE = settings.BASE_DN
