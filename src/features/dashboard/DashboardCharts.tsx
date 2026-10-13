/**
 * Gráficos del dashboard: costo por pieza y stock de materiales.
 */
import { Package, TrendingUp } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CostoPieza, MaterialGrafico } from './dashboard-summary';

/** Fracción mínima del círculo para que la etiqueta quepa dentro del segmento. */
const MIN_LABEL_FRACTION = 0.14;

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  value?: number;
}

/** Dibuja etiquetas dentro de los segmentos del grafico circular cuando hay espacio suficiente. */
function renderStockLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: PieLabelProps) {
  if (
    cx == null ||
    cy == null ||
    midAngle == null ||
    innerRadius == null ||
    outerRadius == null ||
    percent == null ||
    value == null ||
    percent < MIN_LABEL_FRACTION
  ) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-semibold">
      {value}
    </text>
  );
}

export function CostoPorPiezaChart({ data }: { data: CostoPieza[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Costo por Pieza
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              tickFormatter={value => String(value ?? '').slice(0, 12)}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.displayName ?? _label}
              formatter={(v: number) => [`$${v}`, 'Costo']}
            />
            <Bar dataKey="costo" fill="hsl(212, 99%, 25%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StockChart({ materiales }: { materiales: MaterialGrafico[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Stock de Materiales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={materiales}
                  dataKey="stock"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  labelLine={false}
                  label={renderStockLabel}
                >
                  {materiales.map(material => (
                    <Cell key={material.id} fill={material.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, _name, entry) => [
                    `${value} ${entry.payload.unit}`.trim(),
                    entry.payload.fullName,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {materiales.map(material => (
              <div
                key={material.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: material.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{material.fullName}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${material.statusClass}`}>
                      {material.statusLabel}
                    </span>
                  </div>
                </div>

                <span className="shrink-0 text-sm font-semibold text-foreground">
                  {material.stock} {material.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
