from django.contrib import admin

from apps.inventory.models import MateriaPrima, MovimientoInventario, Proveedor, TrabajadorProduccion, UnidadMedida


admin.site.register(UnidadMedida)
admin.site.register(Proveedor)
admin.site.register(TrabajadorProduccion)
admin.site.register(MateriaPrima)
admin.site.register(MovimientoInventario)