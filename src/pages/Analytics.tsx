import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { EnergyBarChart } from '@/components/charts/EnergyBarChart';
import { PieChartComponent } from '@/components/charts/PieChartComponent';
import { generateMonthlyData, generateHourlyData, calculateKPIs, departmentBreakdown } from '@/data/mockData';
import {
  BarChart3,
  TrendingUp,
  Target,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const monthlyData = generateMonthlyData(12);
const hourlyData = generateHourlyData(24);
const kpis = calculateKPIs();

const efficiencyData = departmentBreakdown.map((d, i) => ({
  name: d.name,
  value: 75 + Math.random() * 20,
  color: d.color,
}));

const performanceMetrics = [
  { name: 'Energy Efficiency', value: 87, target: 90, trend: 3.2 },
  { name: 'Carbon Intensity', value: 0.42, target: 0.38, trend: -5.1 },
  { name: 'Cost per kWh', value: 0.385, target: 0.380, trend: -2.8 },
  { name: 'Peak Demand Ratio', value: 0.78, target: 0.70, trend: 1.5 },
];

export default function Analytics() {
  return (
    <Layout title="Analytics" subtitle="Advanced energy analytics and insights">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Overall Score"
          value="87/100"
          icon={<BarChart3 className="h-5 w-5" />}
          trend={5}
          trendLabel="vs last month"
          variant="primary"
        />
        <KPICard
          title="Efficiency Rate"
          value={`${kpis.avgEfficiency}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={2.3}
          trendLabel="improving"
          variant="success"
        />
        <KPICard
          title="Target Achievement"
          value="78%"
          icon={<Target className="h-5 w-5" />}
          subtitle="Annual goals"
        />
        <KPICard
          title="Data Coverage"
          value="99.2%"
          icon={<Layers className="h-5 w-5" />}
          subtitle="Sensor uptime"
          variant="success"
        />
      </div>

      {/* Performance Metrics */}
      <div className="glass-card p-6 rounded-xl border border-border mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetrics.map((metric) => (
            <div
              key={metric.name}
              className="p-4 rounded-lg bg-muted/50 border border-border/50"
            >
              <p className="text-sm text-muted-foreground mb-2">{metric.name}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {typeof metric.value === 'number' && metric.value < 10
                      ? metric.value.toFixed(3)
                      : metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Target:{' '}
                    {typeof metric.target === 'number' && metric.target < 10
                      ? metric.target.toFixed(3)
                      : metric.target}
                  </p>
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${metric.trend > 0 ? 'text-success' : 'text-destructive'
                    }`}
                >
                  {metric.trend > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {Math.abs(metric.trend)}%
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (metric.value / metric.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Consumption Trends */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Consumption Trends Analysis
          </h2>
          <EnergyLineChart
            data={monthlyData}
            xKey="month"
            lines={[
              { key: 'consumption', name: 'Consumption', color: '#10b981', strokeWidth: 2 },
              { key: 'cost', name: 'Cost (DT)', color: '#3b82f6', strokeWidth: 2 },
              { key: 'carbon', name: 'Carbon', color: '#a855f7', strokeWidth: 2 },
            ]}
            height={320}
          />
        </div>

        {/* Efficiency by Department */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Efficiency by Department
          </h2>
          <div className="space-y-4">
            {efficiencyData.map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="text-sm text-foreground">{dept.name}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {dept.value.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${dept.value}%`,
                      backgroundColor: dept.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Department Comparison
          </h2>
          <EnergyBarChart
            data={monthlyData.slice(-6)}
            xKey="month"
            bars={[
              { key: 'production', name: 'Production', color: '#10b981' },
              { key: 'assembly', name: 'Assembly', color: '#3b82f6' },
              { key: 'packaging', name: 'Packaging', color: '#eab308' },
              { key: 'warehouse', name: 'Warehouse', color: '#a855f7' },
            ]}
            height={300}
          />
        </div>

        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Hourly Pattern Analysis
          </h2>
          <EnergyLineChart
            data={hourlyData}
            xKey="time"
            lines={[
              { key: 'total', name: 'Total', color: '#10b981', strokeWidth: 2 },
              { key: 'production', name: 'Production', color: '#3b82f6' },
            ]}
            height={300}
            showLegend
          />
        </div>
      </div>
    </Layout>
  );
}
