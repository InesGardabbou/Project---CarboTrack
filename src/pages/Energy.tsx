import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { EnergyBarChart } from '@/components/charts/EnergyBarChart';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Zap, TrendingDown, Factory, DollarSign, Activity } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useState, useMemo } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';

export default function EnergyConsumption() {
    const [selectedMachineId, setSelectedMachineId] = useState<string>("all");
    const { machines, history, loading } = useRealtimeData(selectedMachineId === "all" ? undefined : selectedMachineId);
    const appMachines = useAppStore((state) => state.machines);

    const activeMachines = machines.length > 0 ? machines : appMachines;

    const chartData = useMemo(() => {
        return history.map(entry => ({
            time: format(entry.timestamp, 'HH:mm'),
            timestamp: entry.timestamp,
            consumption: entry.consumption,
            temperature: entry.temperature,
            co2: entry.co2Emissions,
        }));
    }, [history]);

    const monthlyData = useMemo(() => {
        if (history.length === 0) return [];
        const agg: Record<string, { consumption: number, count: number }> = {};
        history.forEach(h => {
            const m = format(h.timestamp, 'MMM');
            if (!agg[m]) agg[m] = { consumption: 0, count: 0 };
            agg[m].consumption += h.consumption;
            agg[m].count += 1;
        });
        return Object.entries(agg).map(([month, val]) => ({
            month,
            consumption: val.consumption
        }));
    }, [history]);

    const currentMachine = activeMachines.find(m => m.id === selectedMachineId);
    const latestConsumption = selectedMachineId === "all"
        ? activeMachines.reduce((sum, m) => sum + m.consumption, 0)
        : (currentMachine?.consumption || 0);

    const totalConsumptionQuery = history.reduce((acc, curr) => acc + curr.consumption, 0);

    return (
        <Layout title="Energy Consumption" subtitle="Detailed energy usage analytics">

            {/* Live Monitor Section */}
            <div className="glass-card p-6 rounded-xl border border-border mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Live Machine Monitor</h2>
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

                {selectedMachineId !== "all" ? (
                    <div className="animate-fade-in">
                        <div className="mb-4 flex gap-6">
                            <div>
                                <span className="text-sm text-muted-foreground mr-2">
                                    Current Consumption:
                                </span>
                                <span className="text-2xl font-bold text-foreground">
                                    {latestConsumption.toFixed(1)} kWh
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-muted-foreground mr-2">History Points:</span>
                                <span className="text-2xl font-bold text-foreground">
                                    {chartData.length}
                                </span>
                            </div>
                        </div>

                        {chartData.length > 0 ? (
                            <EnergyLineChart
                                data={chartData}
                                xKey="time"
                                lines={[
                                    { key: 'consumption', name: 'Consumption (kWh)', color: '#f59e0b', strokeWidth: 2 },
                                    { key: 'temperature', name: 'Temperature (°C)', color: '#ef4444', strokeWidth: 1 },
                                ]}
                                height={300}
                            />
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                                Waiting for live data...
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-[100px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                        Select a specific machine to view detailed historical data.
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KPICard
                    title={selectedMachineId === 'all' ? "Avg Total Rate" : "Avg Consumption"}
                    value={`${(selectedMachineId === 'all'
                        ? latestConsumption
                        : (totalConsumptionQuery / (chartData.length || 1))).toFixed(1)} kWh`}
                    icon={<Zap className="h-5 w-5" />}
                    trend={0}
                    trendLabel="current"
                    variant="primary"
                />
                <KPICard
                    title="Avg Temperature"
                    value={`${selectedMachineId === 'all'
                        ? (activeMachines.reduce((s, m) => s + m.temperature, 0) / (activeMachines.length || 1)).toFixed(1)
                        : Math.max(...(history.map(h => h.temperature) || [0]), 0).toFixed(1)} °C`}
                    icon={<TrendingDown className="h-5 w-5" />}
                    variant="warning"
                />
                <KPICard
                    title="Est. Hourly Cost"
                    value={`${(latestConsumption * 0.380).toFixed(2)} DT`}
                    icon={<DollarSign className="h-5 w-5" />}
                    variant="default"
                />
            </div>

            {/* Charts Grid - Only show if valid data or valid state */}
            <div className="grid grid-cols-1 gap-6 mb-6">
                {monthlyData.length > 0 && selectedMachineId !== 'all' && (
                    <div className="glass-card p-6 rounded-xl border border-border">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Historical Trend
                        </h2>
                        <EnergyBarChart
                            data={monthlyData}
                            xKey="month"
                            bars={[
                                { key: 'consumption', name: 'Consumption', color: '#10b981' },
                            ]}
                            height={280}
                            showLegend={false}
                        />
                    </div>
                )}
            </div>
        </Layout>
    );
}
