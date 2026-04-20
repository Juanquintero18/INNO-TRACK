from django.contrib import admin

from apps.production.models import Orden, Pieza, PiezaHistorial, PiezaMateriaPrima, Proyecto


admin.site.register(Proyecto)
admin.site.register(Orden)
admin.site.register(Pieza)
admin.site.register(PiezaMateriaPrima)
admin.site.register(PiezaHistorial)