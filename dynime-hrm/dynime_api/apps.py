from django.apps import AppConfig


class HorillaApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "dynime_api"

    def ready(self):
        """
        Initialize API documentation when the app is ready
        """
        # Import and register API documentation components
        import dynime_api.schema  # noqa
