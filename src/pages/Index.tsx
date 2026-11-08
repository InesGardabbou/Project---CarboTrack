import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { EnergyBarChart } from '@/components/charts/EnergyBarChart';
import { Zap, TrendingUp, DollarSign, Lightbulb } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo } from 'react';

export default function Dashboard() {
  const machines = useAppStore((state) => state.machines);
  const { carbon, departments, stats, activities, loading } = useDashboardData();

  const kpis = useMemo(() => {
    if (stats) return stats;
    return {
      totalConsumption: 0,
      avgEfficiency: 0,
      totalCO2: 0,
      activeMachines: machines.length,
      totalMachines: machines.length,
      criticalMachines: 0,
      maintenanceMachines: 0,
      avgTemperature: 0,
      uptime: 0,
      costSavingsPotential: 0,
      co2ReductionPotential: 0,
    };
  }, [machines.length, stats]);

  const carbonChartData = useMemo(() => carbon.map(entry => ({
    month: entry.month,
    carbon: entry.carbon,
    target: entry.target,
  })), [carbon]);

  const departmentData = useMemo(() => departments.map((d) => ({
    name: d.name,
    consumption: Math.round(d.consumption),
  })), [departments]);

  const insightItems = useMemo(() => activities
    .slice(-6)
    .reverse()
    .map((a) => ({
      id: a.id,
      title: a.user,
      description: a.action,
    })), [activities]);
  return (
    <Layout title="Dashboard" subtitle="Energy & Carbon Overview">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Consumption"
          value={`${(kpis.totalConsumption / 1000).toFixed(1)}k kWh`}
          icon={<Zap className="h-5 w-5" />}
          trend={0}
          trendLabel={loading ? 'loading...' : 'live'}
          variant="primary"
        />
        <KPICard
          title="Efficiency Trend"
          value={`${kpis.avgEfficiency}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={0}
          trendLabel={loading ? 'loading...' : 'live'}
          variant="success"
        />
        <KPICard
          title="Cost Distribution"
          value={`${(kpis.totalConsumption * 0.380 / 1000).toFixed(1)}k DT`}
          icon={<DollarSign className="h-5 w-5" />}
          trend={0}
          trendLabel="calculated"
          variant="default"
        />
        <KPICard
          title="Potential Savings"
          value={`${(kpis.costSavingsPotential * 3 / 1000).toFixed(1)}k DT`}
          icon={<Lightbulb className="h-5 w-5" />}
          trend={0}
          trendLabel="from DB"
          variant="primary"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Energy Consumption Overview */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Energy & Cost Overview
          </h2>
          <EnergyLineChart
            data={carbonChartData}
            xKey="month"
            lines={[
              { key: 'carbon', name: 'Carbon', color: '#10b981', strokeWidth: 2 },
              { key: 'target', name: 'Target', color: '#3b82f6', strokeWidth: 2 },
            ]}
            height={320}
          />
        </div>

        {/* Key Insights */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Key Insights</h2>
          </div>
          <div className="space-y-4">
            {insightItems.length === 0 && (
              <div className="text-sm text-muted-foreground">No recent activities yet.</div>
            )}
            {insightItems.map((insight) => (
              <div
                key={insight.id}
                className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Breakdown by Department */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Energy Breakdown by Department
          </h2>
          <EnergyBarChart
            data={departmentData}
            xKey="name"
            bars={[
              { key: 'consumption', name: 'Consumption (kWh)', color: '#10b981' },
            ]}
            height={280}
            layout="vertical"
            showLegend={false}
          />
        </div>

        {/* Comparative Analysis */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Comparative Analysis
          </h2>
          <EnergyBarChart
            data={carbonChartData}
            xKey="month"
            bars={[
              { key: 'carbon', name: 'Carbon', color: '#10b981' },
              { key: 'target', name: 'Target', color: '#3b82f6' },
            ]}
            height={280}
          />
        </div>
      </div>
    </Layout>
  );
}
