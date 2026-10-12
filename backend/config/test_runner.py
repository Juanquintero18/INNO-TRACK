"""Runner de pruebas que crea las tablas legacy en la base temporal."""

from django.apps import apps
from django.test.runner import DiscoverRunner


class LegacyTablesTestRunner(DiscoverRunner):
    """Marca los modelos `managed = False` como administrados durante las pruebas.

    Así Django crea sus tablas en la base de pruebas igual que las demás.
    """

    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        self._unmanaged_models = [model for model in apps.get_models() if not model._meta.managed]

        for model in self._unmanaged_models:
            model._meta.managed = True

    def teardown_test_environment(self, **kwargs):
        for model in self._unmanaged_models:
            model._meta.managed = False

        super().teardown_test_environment(**kwargs)
