/**
 * Dashboard principal del sistema.
 *
 * Resume el estado operativo con metricas agregadas, graficos de apoyo y
 * alertas sobre stock critico para dar contexto al usuario apenas entra.
 */
import { ExportExcelButton } from '@/components/ExportExcelButton';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { CostoPorPiezaChart, StockChart } from '@/features/dashboard/DashboardCharts';
import { RecentActivity, StatsCards, StockStatusOverview } from '@/features/dashboard/DashboardSections';
import { buildDashboardSheets, buildDashboardSummary } from '@/features/dashboard/dashboard-summary';

/** Construye la vista ejecutiva con datos agregados del inventario y la produccion. */
export default function Dashboard() {
  const { user } = useAuth();
  const { piezasList, materiasList, movimientosList, getStockLevel } = useAppData();
  const summary = buildDashboardSummary(piezasList, materiasList, movimientosList, getStockLevel);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenido, {user?.nombre}</h1>
          <p className="text-muted-foreground mt-1">Resumen general del sistema de costos e inventario</p>
        </div>

        <ExportExcelButton fileName="dashboard_resumen" getSheets={() => buildDashboardSheets(summary)} />
      </div>

      <StatsCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostoPorPiezaChart data={summary.costoPorPieza} />
        <StockChart materiales={summary.materialesGrafico} />
      </div>

      {summary.totalMaterias > 0 && <StockStatusOverview materiales={summary.materialesClasificados} />}

      <RecentActivity movimientos={summary.actividadReciente} />
    </div>
  );
}
