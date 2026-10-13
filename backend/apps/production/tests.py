"""Pruebas de caracterización de la API de producción."""

from apps.production.models import Pieza, PiezaHistorial, PiezaMateriaPrima
from config.testing import ApiTestCase


BASE = "/api/production"


class ProyectosYOrdenesTests(ApiTestCase):
    def test_listados(self):
        self.assert_golden("proyectos", self.client.get(f"{BASE}/proyectos/"))
        self.assert_golden("ordenes", self.client.get(f"{BASE}/ordenes/"))

    def test_solo_el_administrador_escribe(self):
        resultado = {}

        for rol, usuario in (("almacenista", self.almacenista), ("trabajador", self.trabajador)):
            self.login_as(usuario)
            resultado[f"{rol} crea proyecto"] = self.client.post(f"{BASE}/proyectos/", {"nombre": "X"}, format="json").status_code
            resultado[f"{rol} crea orden"] = self.client.post(f"{BASE}/ordenes/", {"codigo_orden": "X"}, format="json").status_code
            resultado[f"{rol} lista proyectos"] = self.client.get(f"{BASE}/proyectos/").status_code

        self.assert_golden_data("matriz", resultado)

    def test_crud_de_proyecto(self):
        creado = self.client.post(f"{BASE}/proyectos/", {"nombre": "Río Lento", "codigo": "RL-05", "descripcion": None, "fecha_inicio": "2026-04-01", "fecha_fin": None, "estado": "pausado"}, format="json")
        self.assert_golden("crear", creado)

        url = f"{BASE}/proyectos/{creado.json()['id']}/"
        self.assert_golden("actualizar", self.client.put(url, {"nombre": "Río Lento II", "codigo": None, "estado": None}, format="json"))
        self.assert_golden("eliminar", self.client.delete(url))

    def test_no_elimina_proyecto_con_ordenes(self):
        self.assert_golden("bloqueado", self.client.delete(f"{BASE}/proyectos/{self.aquaventura.id}/"))

    def test_crud_de_orden(self):
        creada = self.client.post(f"{BASE}/ordenes/", {"proyecto_id": self.sin_ordenes.id, "codigo_orden": "ORD-300", "fecha_creacion": "2026-03-14", "estado": "abierta"}, format="json")
        self.assert_golden("crear", creada)

        url = f"{BASE}/ordenes/{creada.json()['id']}/"
        self.assert_golden("mover_de_proyecto", self.client.put(url, {"proyecto_id": self.aquaventura.id, "codigo_orden": "ORD-300", "fecha_creacion": None, "estado": "cerrada"}, format="json"))
        self.assert_golden("eliminar", self.client.delete(url))

    def test_no_elimina_orden_con_piezas(self):
        self.assert_golden("bloqueada", self.client.delete(f"{BASE}/ordenes/{self.orden_1.id}/"))


class PiezasTests(ApiTestCase):
    def nueva_pieza(self, **cambios):
        return {
            "orden_id": self.orden_vacia.id,
            "usuario_id": self.trabajador.id,
            "trace_id": "TR-0050",
            "nombre": "Curva doble",
            "fecha_gelcoat": "2026-03-12",
            "fecha_qc": None,
            "peso_real": 30.25,
            "materias_primas": [
                {"materia_prima_id": self.resina.id, "cantidad_teorica": 12.5, "cantidad_real": 12.5},
                {"materia_prima_id": self.gelcoat.id, "cantidad_teorica": 2, "cantidad_real": None},
            ],
            **cambios,
        }

    def test_listado_con_historial_antiguo(self):
        self.assert_golden("listado", self.client.get(f"{BASE}/piezas/"))

    def test_crear_registra_historial_de_creacion(self):
        self.login_as(self.trabajador)

        response = self.client.post(f"{BASE}/piezas/", self.nueva_pieza(), format="json")

        self.assert_golden("crear", response)
        evento = PiezaHistorial.objects.get(pieza_id=response.json()["id"])
        self.assert_golden_data("historial_guardado", {"accion": evento.accion, "usuario_id": evento.usuario_id, "descripcion": evento.descripcion})

    def test_crear_sin_materiales(self):
        self.assert_golden("crear", self.client.post(f"{BASE}/piezas/", self.nueva_pieza(materias_primas=[]), format="json"))

    def test_editar_registra_cambios_de_campos_y_materiales(self):
        creada = self.client.post(f"{BASE}/piezas/", self.nueva_pieza(), format="json").json()
        url = f"{BASE}/piezas/{creada['id']}/"

        cambios = self.nueva_pieza(
            nombre="Curva doble reforzada",
            orden_id=self.orden_1.id,
            usuario_id=self.admin.id,
            fecha_qc="2026-03-20",
            peso_real=31,
            materias_primas=[
                {"materia_prima_id": self.resina.id, "cantidad_teorica": 12.5, "cantidad_real": 13},
                {"materia_prima_id": self.fibra.id, "cantidad_teorica": 6, "cantidad_real": 6},
            ],
        )
        self.assert_golden("editar_con_cambios", self.client.put(url, cambios, format="json"))
        self.assert_golden("editar_sin_cambios", self.client.put(url, cambios, format="json"))

        solo_campos = {"nombre": "Curva doble final"}
        self.assert_golden("editar_solo_un_campo_conserva_materiales", self.client.patch(url, solo_campos, format="json"))

    def test_materiales_deshabilitados(self):
        nueva = self.nueva_pieza(materias_primas=[{"materia_prima_id": self.catalizador.id, "cantidad_teorica": 1, "cantidad_real": 1}])
        self.assert_golden("no_se_agregan_a_piezas_nuevas", self.client.post(f"{BASE}/piezas/", nueva, format="json"))

        # La pieza de ejemplo ya tenía el catalizador: puede conservarlo al editarse.
        conservar = {
            "materias_primas": [
                {"materia_prima_id": self.resina.id, "cantidad_teorica": 20, "cantidad_real": 21.5},
                {"materia_prima_id": self.catalizador.id, "cantidad_teorica": 1, "cantidad_real": 0.8},
            ]
        }
        self.assert_golden("se_conservan_en_piezas_que_ya_los_tenian", self.client.patch(f"{BASE}/piezas/{self.pieza.id}/", conservar, format="json"))

    def test_permisos(self):
        self.login_as(self.almacenista)
        self.assertEqual(self.client.post(f"{BASE}/piezas/", self.nueva_pieza(), format="json").status_code, 403)
        self.assertEqual(self.client.get(f"{BASE}/piezas/").status_code, 200)

    def test_eliminar_borra_hijos_y_deja_auditoria_completa(self):
        self.assert_golden("eliminar", self.client.delete(f"{BASE}/piezas/{self.pieza.id}/"))

        self.assertFalse(Pieza.objects.filter(pk=self.pieza.id).exists())
        self.assertEqual(PiezaMateriaPrima.objects.count(), 0)
        self.assertEqual(PiezaHistorial.objects.count(), 0)
        self.assert_golden("auditoria", self.client.get("/api/audit/logs/"))

    def test_endpoints_de_materiales_e_historial(self):
        self.assert_golden("materiales", self.client.get(f"{BASE}/pieza-materias-primas/"))
        self.assert_golden("historial", self.client.get(f"{BASE}/pieza-historial/"))
