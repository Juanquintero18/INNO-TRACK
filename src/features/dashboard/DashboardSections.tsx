/**
 * Secciones del dashboard que no son gráficos: tarjetas de cifras, estado del
 * stock por materia prima y actividad reciente.
 */
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeftRight, DollarSign, Package, Puzzle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MovimientoInventario } from '@/lib/types';
import type { DashboardSummary, MaterialClasificado } from './dashboard-summary';

const cardsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function StatsCards({ summary }: { summary: DashboardSummary }) {
  const stats = [
    { label: 'Piezas Registradas', value: summary.totalPiezas, icon: Puzzle, color: 'text-primary' },
    { label: 'Materias Primas', value: summary.totalMaterias, icon: Package, color: 'text-primary' },
    { label: 'Movimientos', value: summary.totalMovimientos, icon: ArrowLeftRight, color: 'text-primary' },
    { label: 'Costo Promedio', value: `$${summary.costoPromedio.toFixed(2)}`, icon: DollarSign, color: 'text-success' },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={cardsContainer}
      initial="hidden"
      animate="show"
    >
      {stats.map(({ label, value, icon: Icon, color }) => (
        <motion.div key={label} variants={cardItem}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Niveles de estabilidad en el orden en que se muestran, con su rango y colores. */
const STATUS_SECTIONS = [
  { title: 'Crítico', rank: 0, toneClass: 'text-destructive', badgeClass: 'bg-destructive/10 text-destructive' },
  { title: 'Bajo', rank: 1, toneClass: 'text-warning', badgeClass: 'bg-warning/10 text-warning' },
  { title: 'Estable', rank: 2, toneClass: 'text-success', badgeClass: 'bg-success/10 text-success' },
];

export function StockStatusOverview({ materiales }: { materiales: MaterialClasificado[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Estado del Stock por Materia Prima
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {STATUS_SECTIONS.map(section => {
            const items = materiales.filter(material => material.statusRank === section.rank);

            return (
              <div key={section.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-semibold ${section.toneClass}`}>{section.title}</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${section.badgeClass}`}>
                    {items.length}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    No hay materiales en este rango.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(material => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between gap-4 rounded-lg border bg-background px-3 py-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{material.fullName}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${material.statusClass}`}>
                              {material.statusLabel}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{material.helperText}</p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {material.stock} {material.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">Stock actual</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const TIPO_TONE_CLASSES: Record<MovimientoInventario['tipo'], string> = {
  entrada: 'bg-success/10 text-success',
  salida: 'bg-destructive/10 text-destructive',
  ajuste: 'bg-warning/10 text-warning',
};

export function RecentActivity({ movimientos }: { movimientos: MovimientoInventario[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {movimientos.map(movimiento => (
            <div
              key={movimiento.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    TIPO_TONE_CLASSES[movimiento.tipo] ?? TIPO_TONE_CLASSES.ajuste
                  }`}
                >
                  {movimiento.tipo}
                </span>
                <span className="text-sm text-foreground">{movimiento.materia_prima?.nombre}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-foreground">
                  {movimiento.cantidad} {movimiento.materia_prima?.unidad_medida?.abreviatura}
                </span>
                <p className="text-xs text-muted-foreground">{movimiento.fecha}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
