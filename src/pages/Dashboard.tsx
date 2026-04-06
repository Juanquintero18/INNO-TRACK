import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { piezas, materiasPrimas, movimientosInventario, calcularCostoPieza, getStockLevel, proveedores } from '@/lib/mock-data';
import { Puzzle, Package, ArrowLeftRight, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['hsl(212, 99%, 25%)', 'hsl(212, 80%, 45%)', 'hsl(212, 60%, 60%)', 'hsl(0, 0%, 50%)', 'hsl(142, 71%, 45%)'];

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const totalPiezas = piezas.length;
  const piezasCompletadas = piezas.filter(p => p.fecha_qc).length;
  const costoPromedio = piezas.reduce((sum, p) => sum + calcularCostoPieza(p), 0) / totalPiezas;
  const totalMovimientos = movimientosInventario.length;

  const costoPorPieza = piezas.map(p => ({
    name: p.trace_id,
    costo: Math.round(calcularCostoPieza(p) * 100) / 100,
  }));

  const materialesStock = materiasPrimas.slice(0, 5).map(mp => ({
    name: mp.nombre.length > 15 ? mp.nombre.slice(0, 15) + '…' : mp.nombre,
    stock: Math.round(getStockLevel(mp.id) * 100) / 100,
  }));

  const lowStock = materiasPrimas.filter(mp => getStockLevel(mp.id) < 20);

  const stats = [
    { label: 'Piezas Registradas', value: totalPiezas, icon: Puzzle, color: 'text-primary' },
    { label: 'Materias Primas', value: materiasPrimas.length, icon: Package, color: 'text-primary' },
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
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`$${v}`, 'Costo']} />
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
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={materialesStock} dataKey="stock" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {materialesStock.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
            {movimientosInventario.slice(-5).reverse().map(mov => (
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
