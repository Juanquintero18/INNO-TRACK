from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["entity_type"], name="audit_entity_type_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["entity_id"], name="audit_entity_id_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["deleted_at"], name="audit_deleted_at_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["restored_at"], name="audit_restored_at_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["entity_type", "entity_id"], name="audit_entity_pair_idx"),
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_materia_prima_unidad_medida_id ON materia_prima (unidad_medida_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_materia_prima_unidad_medida_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_materia_prima_id ON movimiento_inventario (materia_prima_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_movimiento_inventario_materia_prima_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_proveedor_id ON movimiento_inventario (proveedor_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_movimiento_inventario_proveedor_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_usuario_id ON movimiento_inventario (usuario_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_movimiento_inventario_usuario_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_trabajador_id ON movimiento_inventario (trabajador_produccion_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_movimiento_inventario_trabajador_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_orden_proyecto_id ON orden (proyecto_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_orden_proyecto_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_pieza_orden_id ON pieza (orden_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_pieza_orden_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_pieza_usuario_id ON pieza (usuario_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_pieza_usuario_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_pieza_historial_usuario_id ON pieza_historial (usuario_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_pieza_historial_usuario_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_pieza_materia_prima_pieza_id ON pieza_materia_prima (pieza_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_pieza_materia_prima_pieza_id",
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS idx_pieza_materia_prima_materia_prima_id ON pieza_materia_prima (materia_prima_id)",
            reverse_sql="DROP INDEX IF EXISTS idx_pieza_materia_prima_materia_prima_id",
        ),
    ]