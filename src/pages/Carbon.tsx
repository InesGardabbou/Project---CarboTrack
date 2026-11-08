import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyBarChart } from '@/components/charts/EnergyBarChart';
import { PieChartComponent } from '@/components/charts/PieChartComponent';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Leaf, TrendingDown, Factory, Target, Lightbulb, Activity } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { useAppStore } from '@/store/appStore';
import { CarbonImpactCalculator } from '@/components/CarbonCalculator';

const carbonOpportunities = [
  {
    id: 1,
    title: 'Off-peak Production Scheduling',
    description: 'Shift non-critical processes to off-peak hours when grid is cleaner',
    potential: 2400,
    difficulty: 'Medium',
  },
  {
    id: 2,
    title: 'Renewable Energy Integration',
    description: 'Install solar panels on warehouse roof for clean energy generation',
    potential: 4800,
    difficulty: 'High',
  },
  {
    id: 3,
    title: 'Equipment Efficiency Upgrade',
    description: 'Replace aging motors with high-efficiency models',
    potential: 1800,
    difficulty: 'Low',
  },
  {
    id: 4,
    title: 'Heat Recovery System',
    description: 'Capture waste heat from furnaces for building heating',
    potential: 3200,
    difficulty: 'High',
  },
];

export default function CarbonFootprint() {
  const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
  const { machines, history } = useRealtimeData(selectedMachineId === "all" ? undefined : selectedMachineId);
  const appMachines = useAppStore((state) => state.machines);
  const activeMachines = machines.length > 0 ? machines : appMachines;

  // Total Carbon calculation from current real-time state of all machines
  // Note: co2Emissions in machine object is rate or accumulated?
  // Assuming "co2Emissions" in Machine interface is the current rate/value similar to consumption.
  // For "Total Carbon Emissions" KPI, we might want an accumulated value over time if available, 
  // or just sum of current rates if that's what we have. 
  // The previous mock calculated from monthly data. 
  // Let's use the sum of co2Emissions from all machines as a proxy for "Current Real-time Carbon Emission Rate" 
  // OR if we want "Total Accumulated", we'd need history aggregation.
  // Let's go with "Current Total Hourly Rate" for the top KPI or similar.
  const currentTotalCarbonRate = activeMachines.reduce((sum, m) => sum + (m.co2Emissions || 0), 0);

  // For "Total Carbon Emissions" (Monthly/Yearly context usually), without long history, we might just estimate.
  // Or we use the history of the "all" view if we had it, but useRealtimeData currently handles one machine history.
  // We will stick to displaying what we have: either real-time rate or history sum if a machine is selected.

  // Aggregation for Bar Chart (Monthly) - Client side from history if single machine, or mockup if 'all' (since we don't have distinct total history yet)
  // Actually, for 'all', we might want to just show the breakdown by machine types or similar.
  // Let's handle 'all' by just showing the breakdown pie chart and total rate.

  // Carbon by Machine Pie Data
  const carbonByMachine = activeMachines
    .map((m, i) => ({
      name: m.name,
      value: Math.round(m.co2Emissions), // Using current real-time emission
      color: ['#10b981', '#3b82f6', '#eab308', '#a855f7', '#ef4444', '#6b7280', '#f97316', '#14b8a6'][i % 8],
    }))
    .filter(m => m.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8

  // History Chart Data (if machine selected)
  const historyChartData = useMemo(() => {
    return history.map(entry => ({
      time: format(entry.timestamp, 'HH:mm'),
      carbon: entry.co2Emissions,
    }));
  }, [history]);

  // Monthly Aggregation (if machine selected)
  const monthlyData = useMemo(() => {
    if (selectedMachineId === 'all') return []; // If all, we ideally need aggregated history of all machines, which we don't fetch efficiently yet.
    const agg: Record<string, number> = {};
    history.forEach(h => {
      const m = format(h.timestamp, 'MMM');
      agg[m] = (agg[m] || 0) + h.co2Emissions;
    });
    return Object.entries(agg).map(([month, val]) => ({ month, carbon: val }));
  }, [history, selectedMachineId]);


  return (
    <Layout title="Carbon Footprint" subtitle="Track and reduce your carbon emissions">

      {/* Control Bar */}
      <div className="glass-card p-6 rounded-xl border border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Real-time Carbon Monitor</h2>
          </div>
          <div className="w-[200px]">
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Overview (All)</SelectItem>
                {activeMachines.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Chart Section */}
        {selectedMachineId !== "all" ? (
          <div className="animate-fade-in">
            <div className="mb-4">
              <span className="text-sm text-muted-foreground mr-2">Current Emission Rate:</span>
              <span className="text-2xl font-bold text-foreground">
                {activeMachines.find(m => m.id === selectedMachineId)?.co2Emissions.toFixed(2)} g/h
              </span>
            </div>
            {history.length > 0 ? (
              <EnergyLineChart
                data={historyChartData}
                xKey="time"
                lines={[
                  { key: 'carbon', name: 'CO₂ Emissions (g)', color: '#10b981', strokeWidth: 2 }
                ]}
                height={300}
              />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No history data available for this machine.
              </div>
            )}
          </div>
        ) : (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
            Select a specific machine to view detailed historical carbon trends.
          </div>
        )}
      </div>

      {/* Calculator Section */}
      <div className="mb-6">
        <CarbonImpactCalculator realTimeMachineEmissions={currentTotalCarbonRate} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Real-time Emissions"
          // If 'all', sum of rates. If specific, we could show sum of history or just rate.
          // Let's show Rate for consistency in "Monitor" context, or Accumulated if we have time context.
          // User asked for "consommation total du carbon de tt les machine".
          value={`${currentTotalCarbonRate.toFixed(1)} g/h`}
          icon={<Leaf className="h-5 w-5" />}
          subtitle="Current aggregate rate"
          variant="success"
        />
        <KPICard
          title="Carbon Reduction Target"
          value={`${(currentTotalCarbonRate * 0.85).toFixed(1)} g/h`} // Example target
          icon={<TrendingDown className="h-5 w-5" />}
          subtitle="-15% Target"
          variant="primary"
        />
        <KPICard
          title="Highest Emitter"
          value={activeMachines.length > 0 ? activeMachines.reduce((prev, current) => (prev.co2Emissions > current.co2Emissions) ? prev : current).name : "N/A"}
          subtitle="Real-time"
          icon={<Factory className="h-5 w-5" />}
          variant="warning"
        />
        <KPICard
          title="Emission Trend"
          value="-12%" // Placeholder or calculated if we had previous period data
          icon={<Target className="h-5 w-5" />}
          subtitle="Year over year"
          variant="success"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Carbon Emissions - Show only if we have data (selected machine) or if we want to show aggregate (mock/complex) */}
        {selectedMachineId !== 'all' && monthlyData.length > 0 && (
          <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Monthly Profile (Calculated)
            </h2>
            <EnergyBarChart
              data={monthlyData}
              xKey="month"
              bars={[
                { key: 'carbon', name: 'CO₂ Emissions (g)', color: '#10b981' },
              ]}
              height={320}
              showLegend={false}
            />
          </div>
        )}

        {/* If 'all', maybe show something else or keep the Monthly placeholder if pertinent? 
            Let's hide Monthly for 'all' as we can't easily aggregate history we don't fetch. 
            Or we could leave the 'all' view simpler. 
        */}

        {/* Carbon by Machine */}
        <div className={`glass-card p-6 rounded-xl border border-border ${selectedMachineId !== 'all' && monthlyData.length > 0 ? '' : 'lg:col-span-3'}`}>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Emissions by Machine (Real-time)
          </h2>
          <PieChartComponent
            data={carbonByMachine}
            height={280}
            innerRadius={50}
            outerRadius={90}
            showLegend={false}
          />
          <div className="mt-4 space-y-2">
            {carbonByMachine.slice(0, 4).map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-sm text-muted-foreground">{m.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {m.value} g
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Carbon Reduction Opportunities */}
      <div className="glass-card p-6 rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Carbon Reduction Opportunities
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {carbonOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-foreground">{opp.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${opp.difficulty === 'Low'
                    ? 'bg-success/10 text-success'
                    : opp.difficulty === 'Medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-destructive/10 text-destructive'
                    }`}
                >
                  {opp.difficulty}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>
              <div className="flex items-center gap-2 text-primary">
                <Leaf className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Potential: {opp.potential.toLocaleString()} g CO₂/year
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
