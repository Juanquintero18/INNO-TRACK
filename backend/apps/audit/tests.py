"""Pruebas de caracterización de la auditoría de eliminaciones y su restauración."""

from apps.accounts.models import AppUser
from apps.inventory.models import MateriaPrima, MovimientoInventario, Proveedor, TrabajadorProduccion
from apps.production.models import Pieza, PiezaHistorial, PiezaMateriaPrima
from config.testing import ApiTestCase


LOGS = "/api/audit/logs/"


class AuditoriaTests(ApiTestCase):
    def eliminar_uno_de_cada_tipo(self):
        """Elimina por la API un registro de cada tipo auditado.

        El orden importa: primero se borra lo que referencia a lo demás, para
        no dejar llaves foráneas colgando.
        """
        movimiento = MovimientoInventario.objects.get(referencia="OC-1002")

        for url in (
            f"/api/production/piezas/{self.pieza.id}/",
            f"/api/inventory/movimientos/{movimiento.id}/",
            f"/api/inventory/materias-primas/{self.catalizador.id}/",
            f"/api/inventory/proveedores/{self.fibramax.id}/",
            f"/api/inventory/trabajadores/{self.laura.id}/",
            f"/api/accounts/users/{self.trabajador.id}/",
        ):
            self.assertEqual(self.client.delete(url).status_code, 204, url)

    def test_registro_vacio(self):
        self.assert_golden("vacio", self.client.get(LOGS))

    def test_registro_de_cada_tipo_de_eliminacion(self):
        self.eliminar_uno_de_cada_tipo()

        self.assert_golden("listado", self.client.get(LOGS))
        self.assert_golden("detalle", self.client.get(f"{LOGS}1/"))

    def test_restaurar_cada_tipo(self):
        self.eliminar_uno_de_cada_tipo()
        respuestas = {}

        for log in self.client.get(LOGS).json():
            response = self.client.post(f"{LOGS}{log['id']}/restore/")
            respuestas[log["entityType"]] = {"status": response.status_code, "body": response.json()}

        self.assert_golden_data("respuestas", respuestas)
        self.assert_golden("listado_tras_restaurar", self.client.get(LOGS))

        # Cada registro vuelve con su mismo ID y, en la pieza, con sus hijos.
        self.assertTrue(Pieza.objects.filter(pk=self.pieza.id, trace_id="TR-0001").exists())
        self.assertEqual(PiezaMateriaPrima.objects.filter(pieza_id=self.pieza.id).count(), 2)
        self.assertEqual(PiezaHistorial.objects.filter(pieza_id=self.pieza.id).count(), 2)
        self.assertTrue(MateriaPrima.objects.filter(pk=self.catalizador.id).exists())
        self.assertTrue(Proveedor.objects.filter(pk=self.fibramax.id).exists())
        self.assertTrue(TrabajadorProduccion.objects.filter(pk=self.laura.id).exists())
        self.assertTrue(MovimientoInventario.objects.filter(referencia="OC-1002").exists())

        restaurado = AppUser.objects.get(pk=self.trabajador.id)
        self.assertEqual(restaurado.contrasena, self.trabajador.contrasena)

    def test_no_se_restaura_dos_veces(self):
        self.client.delete(f"/api/inventory/trabajadores/{self.laura.id}/")
        self.client.post(f"{LOGS}1/restore/")

        self.assert_golden("segunda_vez", self.client.post(f"{LOGS}1/restore/"))
        self.assertEqual(TrabajadorProduccion.objects.filter(pk=self.laura.id).count(), 1)

    def test_permisos(self):
        self.client.delete(f"/api/inventory/trabajadores/{self.laura.id}/")
        resultado = {}

        for rol, usuario in (("almacenista", self.almacenista), ("trabajador", self.trabajador), ("sin sesion", None)):
            self.login_as(usuario)
            resultado[f"{rol} lista"] = self.client.get(LOGS).status_code
            resultado[f"{rol} restaura"] = self.client.post(f"{LOGS}1/restore/").status_code

        self.assert_golden_data("matriz", resultado)
