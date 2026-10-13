"""Pruebas del flujo de recuperación de contraseña."""

import re
from datetime import datetime, timedelta
from unittest import mock
from urllib.parse import parse_qs, urlparse

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import mail
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import AppUser
from apps.accounts.password_reset import password_reset_token_generator
from config.testing import ApiTestCase


REQUEST_URL = "/api/auth/password-reset/"
CONFIRM_URL = "/api/auth/password-reset/confirm/"
OLD_PASSWORD = "clave-anterior-2026"
NEW_PASSWORD = "Tobogan-azul-58"


class PasswordResetTests(APITestCase):
    def setUp(self):
        # Los límites de frecuencia viven en caché y no deben cruzarse entre pruebas.
        cache.clear()
        self.user = AppUser.objects.create(
            nombre="Marcela",
            apellido="Rojas",
            email="marcela@innolution.test",
            contrasena=make_password(OLD_PASSWORD),
            rol="almacenista",
        )

    def request_link(self, email="marcela@innolution.test"):
        """Solicita la recuperación y retorna el uid y token del enlace enviado."""
        response = self.client.post(REQUEST_URL, {"email": email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)

        link = re.search(r"http\S+", mail.outbox[0].body).group(0)
        query = parse_qs(urlparse(link).query)
        return link, {"uid": query["uid"][0], "token": query["token"][0]}

    def assert_password_is(self, raw_password):
        self.user.refresh_from_db()
        self.assertTrue(check_password(raw_password, self.user.contrasena))

    # --- Solicitud ---------------------------------------------------------

    def test_envia_enlace_al_correo_registrado(self):
        link, params = self.request_link(email="MARCELA@innolution.test")

        self.assertEqual(mail.outbox[0].to, ["marcela@innolution.test"])
        self.assertTrue(link.startswith(f"{settings.FRONTEND_URL}/restablecer-contrasena?"))
        self.assertTrue(params["uid"] and params["token"])

    def test_correo_desconocido_responde_igual_y_no_envia_nada(self):
        known = self.client.post(REQUEST_URL, {"email": "marcela@innolution.test"}, format="json")
        unknown = self.client.post(REQUEST_URL, {"email": "nadie@innolution.test"}, format="json")

        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.json(), known.json())
        self.assertEqual(len(mail.outbox), 1)

    def test_fallo_del_servidor_de_correo_no_delata_la_cuenta(self):
        with mock.patch("apps.accounts.password_reset.send_mail", side_effect=OSError("smtp caido")):
            with self.assertLogs("apps.accounts.views", level="ERROR"):
                response = self.client.post(REQUEST_URL, {"email": "marcela@innolution.test"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_de_sesion_vencido_no_bloquea_la_solicitud(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-invalido")

        response = self.client.post(REQUEST_URL, {"email": "marcela@innolution.test"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_limita_solicitudes_repetidas_para_el_mismo_correo(self):
        for _ in range(3):
            response = self.client.post(REQUEST_URL, {"email": "marcela@innolution.test"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post(REQUEST_URL, {"email": "Marcela@innolution.test"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(len(mail.outbox), 3)

    # --- Confirmación ------------------------------------------------------

    def test_cambia_la_contrasena_y_el_enlace_queda_usado(self):
        _, params = self.request_link()

        response = self.client.post(CONFIRM_URL, {**params, "password": NEW_PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_password_is(NEW_PASSWORD)

        login = self.client.post(
            "/api/auth/login/", {"email": "marcela@innolution.test", "password": NEW_PASSWORD}, format="json"
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        # El titular recibe un aviso del cambio.
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("fue cambiada", mail.outbox[1].subject)

        reused = self.client.post(CONFIRM_URL, {**params, "password": "Otra-clave-distinta-77"}, format="json")
        self.assertEqual(reused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assert_password_is(NEW_PASSWORD)

    def test_rechaza_enlace_alterado(self):
        _, params = self.request_link()

        for tampered in (
            {**params, "token": params["token"][:-1] + ("a" if params["token"][-1] != "a" else "b")},
            {**params, "uid": "no-es-base64"},
            {**params, "uid": "OTk5OTk5"},
        ):
            response = self.client.post(CONFIRM_URL, {**tampered, "password": NEW_PASSWORD}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assert_password_is(OLD_PASSWORD)

    def test_rechaza_enlace_vencido(self):
        _, params = self.request_link()
        later = datetime.now() + timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT + 60)

        with mock.patch.object(password_reset_token_generator, "_now", return_value=later):
            response = self.client.post(CONFIRM_URL, {**params, "password": NEW_PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assert_password_is(OLD_PASSWORD)

    def test_rechaza_contrasenas_debiles_sin_gastar_el_enlace(self):
        _, params = self.request_link()

        for weak in ("12345678", "corta", "marcela1"):
            response = self.client.post(CONFIRM_URL, {**params, "password": weak}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, weak)
            self.assertIn("password", response.json(), weak)

        self.assert_password_is(OLD_PASSWORD)

        response = self.client.post(CONFIRM_URL, {**params, "password": NEW_PASSWORD}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

class UsuariosYSesionTests(ApiTestCase):
    """Caracterización del acceso (login, perfil, refresh) y del CRUD de usuarios."""

    def test_login(self):
        self.login_as(None)

        correcto = self.client.post("/api/auth/login/", {"email": "almacen@innolution.test", "password": "clave-de-prueba"}, format="json")
        self.assert_golden("correcto", correcto)
        self.assert_golden("clave_incorrecta", self.client.post("/api/auth/login/", {"email": "almacen@innolution.test", "password": "otra"}, format="json"))
        self.assert_golden("correo_desconocido", self.client.post("/api/auth/login/", {"email": "nadie@innolution.test", "password": "x"}, format="json"))
        self.assert_golden("datos_incompletos", self.client.post("/api/auth/login/", {"email": "no-es-correo"}, format="json"))

        # El token emitido sirve para consultar el perfil y para renovarse.
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {correcto.json()['access']}")
        self.assert_golden("perfil", self.client.get("/api/me/"))
        self.assert_golden("renovar", self.client.post("/api/auth/refresh/", {"token": correcto.json()["access"]}, format="json"))

    def test_token_invalido_o_ausente(self):
        self.login_as(None)
        self.assert_golden("sin_token", self.client.get("/api/me/"))

        self.client.credentials(HTTP_AUTHORIZATION="Bearer no-es-un-token")
        self.assert_golden("token_invalido", self.client.get("/api/me/"))

        self.client.credentials(HTTP_AUTHORIZATION="Bearer uno dos")
        self.assert_golden("cabecera_mal_formada", self.client.get("/api/me/"))

    def test_listado_no_expone_contrasenas(self):
        response = self.client.get("/api/accounts/users/")

        self.assert_golden("listado", response)
        self.assertNotIn("contrasena", response.content.decode())

    def test_crud_de_usuario(self):
        creado = self.client.post("/api/accounts/users/", {"nombre": "Nora", "apellido": "Paz", "email": "nora@innolution.test", "rol": "trabajador", "contrasena": "Clave-Segura-9"}, format="json")
        self.assert_golden("crear", creado)

        usuario = AppUser.objects.get(pk=creado.json()["id"])
        self.assertTrue(check_password("Clave-Segura-9", usuario.contrasena))

        url = f"/api/accounts/users/{usuario.id}/"
        self.assert_golden("actualizar_sin_clave", self.client.put(url, {"nombre": "Nora", "apellido": "Paz Gil", "email": "nora@innolution.test", "rol": "almacenista"}, format="json"))
        usuario.refresh_from_db()
        self.assertTrue(check_password("Clave-Segura-9", usuario.contrasena))

        self.client.patch(url, {"contrasena": "Otra-Clave-77"}, format="json")
        usuario.refresh_from_db()
        self.assertTrue(check_password("Otra-Clave-77", usuario.contrasena))

        self.assert_golden("eliminar", self.client.delete(url))
        self.assert_golden("auditoria", self.client.get("/api/audit/logs/"))

    def test_validaciones_al_crear(self):
        self.assert_golden("sin_clave", self.client.post("/api/accounts/users/", {"nombre": "Sin", "email": "sin@innolution.test"}, format="json"))
        self.assert_golden("correo_repetido", self.client.post("/api/accounts/users/", {"nombre": "Otro", "email": "admin@innolution.test", "contrasena": "x"}, format="json"))

    def test_solo_el_administrador_escribe(self):
        resultado = {}

        for rol, usuario in (("almacenista", self.almacenista), ("trabajador", self.trabajador)):
            self.login_as(usuario)
            resultado[f"{rol} lista"] = self.client.get("/api/accounts/users/").status_code
            resultado[f"{rol} crea"] = self.client.post("/api/accounts/users/", {"nombre": "X", "contrasena": "x"}, format="json").status_code
            resultado[f"{rol} elimina"] = self.client.delete(f"/api/accounts/users/{self.admin.id}/").status_code

        self.assert_golden_data("matriz", resultado)
