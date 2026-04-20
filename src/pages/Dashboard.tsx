//descripcion: Pagina de dashboard con resumen de estadísticas, gráficos y alertas para el sistema de costos e inventario

import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calcularCostoPieza } from '@/lib/domain-utils';
import { Puzzle, Package, ArrowLeftRight, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Colores para los gráficos, definidos como constantes para mantener consistencia y facilitar cambios futuros

const CHART_COLORS = ['hsl(212, 99%, 25%)', 'hsl(212, 80%, 45%)', 'hsl(212, 60%, 60%)', 'hsl(0, 0%, 50%)', 'hsl(142, 71%, 45%)'];


// Componente principal del dashboard que muestra estadísticas clave, gráficos de costo por pieza y stock de materiales, alertas de stock bajo y actividad reciente

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { piezasList, materiasList, movimientosList, getStockLevel } = useAppData();

  const totalPiezas = piezasList.length;
  const costoPromedio = totalPiezas > 0 ? piezasList.reduce((sum, p) => sum + calcularCostoPieza(p), 0) / totalPiezas : 0;
  const totalMovimientos = movimientosList.length;

// Prepara los datos para los gráficos, calculando el costo por pieza y el stock de materiales, y filtrando las materias primas con stock bajo para mostrar alertas

  const costoPorPieza = piezasList.map(p => ({
    name: p.trace_id,
    fullName: p.nombre ?? 'Sin nombre',
    displayName: p.trace_id ? `${p.trace_id} - ${p.nombre ?? 'Sin nombre'}` : p.nombre ?? 'Sin nombre',
    costo: Math.round(calcularCostoPieza(p) * 100) / 100,
  }));

// Para el gráfico de stock de materiales, se toman las primeras 5 materias primas y se calcula su nivel de stock, truncando el nombre si es muy largo para mejorar la visualización

  const materialesStock = materiasList.slice(0, 5).map((mp, index) => {
    const stock = Math.round(getStockLevel(mp.id) * 100) / 100;

    return {
      id: mp.id,
      name: mp.nombre.length > 15 ? mp.nombre.slice(0, 15) + '…' : mp.nombre,
      fullName: mp.nombre,
      stock,
      unit: mp.unidad_medida?.abreviatura ?? '',
      color: CHART_COLORS[index % CHART_COLORS.length],
      statusLabel: stock < 20 ? 'Critico' : stock < 50 ? 'Bajo' : 'Estable',
      statusClass:
        stock < 20
          ? 'bg-destructive/10 text-destructive'
          : stock < 50
            ? 'bg-warning/10 text-warning'
            : 'bg-success/10 text-success',
    };
  });

  const lowStock = materiasList.filter(mp => getStockLevel(mp.id) < 20);

  const stats = [
    { label: 'Piezas Registradas', value: totalPiezas, icon: Puzzle, color: 'text-primary' },
    { label: 'Materias Primas', value: materiasList.length, icon: Package, color: 'text-primary' },
    { label: 'Movimientos', value: totalMovimientos, icon: ArrowLeftRight, color: 'text-primary' },
    { label: 'Costo Promedio', value: `$${costoPromedio.toFixed(2)}`, icon: DollarSign, color: 'text-success' },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  const renderStockLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    value,
  }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    value?: number;
  }) => {
    if (
      cx == null ||
      cy == null ||
      midAngle == null ||
      innerRadius == null ||
      outerRadius == null ||
      percent == null ||
      value == null ||
      percent < 0.14
    ) {
      return null;
    }

    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-semibold"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {user?.nombre}
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen general del sistema de costos e inventario
        </p>
      </div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {stats.map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} variants={item}>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Costo por Pieza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={costoPorPieza}>
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
                      data={materialesStock}
                      dataKey="stock"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      labelLine={false}
                      label={renderStockLabel}
                    >
                      {materialesStock.map(item => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, _name, entry) => [`${value} ${entry.payload.unit}`.trim(), entry.payload.fullName]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {materialesStock.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.fullName}</p>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.statusClass}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {item.stock} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert */}
      {isAdmin && lowStock.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.map(mp => (
                <div key={mp.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background">
                  <span className="text-sm font-medium text-foreground">{mp.nombre}</span>
                  <span className="text-sm text-muted-foreground">
                    Stock: {getStockLevel(mp.id).toFixed(1)} {mp.unidad_medida?.abreviatura}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {movimientosList.slice(-5).reverse().map(mov => (
              <div key={mov.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    mov.tipo === 'entrada' ? 'bg-success/10 text-success' :
                    mov.tipo === 'salida' ? 'bg-destructive/10 text-destructive' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {mov.tipo}
                  </span>
                  <span className="text-sm text-foreground">{mov.materia_prima?.nombre}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">{mov.cantidad} {mov.materia_prima?.unidad_medida?.abreviatura}</span>
                  <p className="text-xs text-muted-foreground">{mov.fecha}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
