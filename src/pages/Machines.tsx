import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { useAppStore } from '@/store/appStore';
import { calculateMachineMetrics, generateHourlyData, type Machine } from '@/data/mockData';
import { format } from 'date-fns';
import {
  Cpu,
  Activity,
  Thermometer,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Zap,
  Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function MachineStatusBadge({ status }: { status: Machine['status'] }) {
  const styles = {
    operational: 'bg-success/10 text-success border-success/30',
    maintenance: 'bg-warning/10 text-warning border-warning/30',
    critical: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  const icons = {
    operational: CheckCircle2,
    maintenance: AlertTriangle,
    critical: XCircle,
  };

  const Icon = icons[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[status]
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function MachineDetails({ machine, onBack }: { machine: Machine; onBack: () => void }) {
  // État pour les données en temps réel
  const [energyData, setEnergyData] = useState(generateHourlyData(24));
  const [tempData, setTempData] = useState(generateHourlyData(24));
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Générer des données de température basées sur la température actuelle de la machine
  const generateTemperatureData = () => {
    const baseTemp = machine.temperature;
    return generateHourlyData(24).map((d, i) => ({
      ...d,
      temp: baseTemp + Math.sin(i / 4) * 8 + Math.random() * 3,
    }));
  };

  // Générer des données d'énergie basées sur la consommation actuelle
  const generateEnergyData = () => {
    const baseConsumption = machine.consumption;
    return generateHourlyData(24).map((d, i) => ({
      ...d,
      total: baseConsumption * (0.8 + Math.sin(i / 6) * 0.4 + Math.random() * 0.2),
    }));
  };

  useEffect(() => {
    // Initialiser les données
    setEnergyData(generateEnergyData());
    setTempData(generateTemperatureData());

    // Mettre à jour les données toutes les 5 secondes pour simuler le temps réel
    const interval = setInterval(() => {
      setEnergyData(currentData => {
        const newData = [...currentData];
        // Déplacer les données
        newData.shift();
        
        // Ajouter un nouveau point avec variation aléatoire
        const lastValue = currentData[currentData.length - 1].total;
        const baseConsumption = machine.consumption;
        const hour = new Date().getHours();
        const variation = 0.8 + Math.sin(hour / 6) * 0.4 + Math.random() * 0.2;
        
        newData.push({
          time: format(new Date(), 'HH:00'),
          total: baseConsumption * variation,
        });

        return newData;
      });

      setTempData(currentData => {
        const newData = [...currentData];
        newData.shift();
        
        // Ajouter un nouveau point de température
        const baseTemp = machine.temperature;
        const hour = new Date().getHours();
        const tempVariation = Math.sin(hour / 4) * 8 + Math.random() * 3;
        
        newData.push({
          time: format(new Date(), 'HH:00'),
          temp: baseTemp + tempVariation,
        });

        return newData;
      });

      setLastUpdate(new Date());
    }, 5000); // Mise à jour toutes les 5 secondes

    return () => clearInterval(interval);
  }, [machine]);

  return (
    <div className="animate-fade-in">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Machines
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{machine.name}</h2>
          <p className="text-muted-foreground">
            {machine.serialNumber} • {machine.department}
          </p>
        </div>
        <MachineStatusBadge status={machine.status} />
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm">Current Consumption</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {machine.consumption.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kWh</span>
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            Last 24h avg: {(energyData.reduce((sum, d) => sum + d.total, 0) / energyData.length).toFixed(1)} kWh
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Thermometer className="h-4 w-4 text-warning" />
            <span className="text-sm">Current Temperature</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {machine.temperature.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">°C</span>
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            Last 24h avg: {(tempData.reduce((sum, d) => sum + (d as any).temp, 0) / tempData.length).toFixed(1)}°C
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Leaf className="h-4 w-4 text-success" />
            <span className="text-sm">Current CO₂</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {machine.co2Emissions.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg/h</span>
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            Total today: {(machine.co2Emissions * 24).toFixed(1)} kg
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm">Live Update</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {format(lastUpdate, 'HH:mm:ss')}
          </p>
          <div className="text-xs text-muted-foreground mt-1">
            Updates every 5s
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Live Energy Consumption</h3>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
          <EnergyLineChart
            data={energyData}
            xKey="time"
            lines={[
              { key: 'total', name: 'Consumption (kWh)', color: '#10b981', strokeWidth: 2 },
            ]}
            height={250}
            showLegend={false}
          />
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Rolling 24-hour window | Last update: {format(lastUpdate, 'HH:mm:ss')}
          </div>
        </div>
        <div className="glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Live Temperature History</h3>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
          <EnergyLineChart
            data={tempData}
            xKey="time"
            lines={[
              { key: 'temp', name: 'Temperature (°C)', color: '#eab308', strokeWidth: 2 },
            ]}
            height={250}
            showLegend={false}
          />
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Rolling 24-hour window | Operating range: 20-80°C
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="glass-card p-4 rounded-xl border border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Hours</h4>
          <p className="text-xl font-bold text-foreground">
            {machine.activeHours.toLocaleString()} hours
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Last Maintenance</h4>
          <p className="text-xl font-bold text-foreground">
            {format(machine.lastMaintenance, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-border">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Power Status</h4>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${machine.status === 'operational' ? 'bg-success animate-pulse' : 'bg-warning'}`}></div>
            <span className="text-xl font-bold text-foreground">
              {machine.status === 'operational' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Machines() {
  const { machines, searchQuery, selectedMachine, setSelectedMachine } = useAppStore();
  const kpis = calculateMachineMetrics(machines);

  const filteredMachines = machines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const healthCounts = {
    healthy: machines.filter((m) => m.status === 'operational').length,
    warning: machines.filter((m) => m.status === 'maintenance').length,
    critical: machines.filter((m) => m.status === 'critical').length,
  };

  // Find the live version of the selected machine to ensure real-time updates
  const liveSelectedMachine = selectedMachine
    ? machines.find(m => m.id === selectedMachine.id) || selectedMachine
    : null;

  if (liveSelectedMachine) {
    return (
      <Layout title="Machine Details" subtitle={liveSelectedMachine.name}>
        <MachineDetails machine={liveSelectedMachine} onBack={() => setSelectedMachine(null)} />
      </Layout>
    );
  }

  return (
    <Layout title="Machines" subtitle="Monitor and manage connected devices">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Machines"
          value={kpis.totalMachines}
          icon={<Cpu className="h-5 w-5" />}
          variant="primary"
        />
        <KPICard
          title="Active Machines"
          value={kpis.activeMachines}
          icon={<Activity className="h-5 w-5" />}
          trend={2}
          trendLabel="this week"
          variant="success"
        />
        <KPICard
          title="Average Temperature"
          value={`${kpis.avgTemperature}°C`}
          icon={<Thermometer className="h-5 w-5" />}
          variant="warning"
        />
        <KPICard
          title="Uptime"
          value={`${kpis.uptime}%`}
          icon={<Clock className="h-5 w-5" />}
          trend={0.5}
          trendLabel="vs last month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Machine List */}
        <div className="lg:col-span-3 glass-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Machine List</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Serial Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Maintenance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMachines.map((machine) => (
                  <tr
                    key={machine.id}
                    onClick={() => setSelectedMachine(machine)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {machine.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {machine.serialNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {machine.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <MachineStatusBadge status={machine.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {format(machine.lastMaintenance, 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {machine.activeHours.toLocaleString()}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Health */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Machine Health</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-foreground">Healthy</span>
              </div>
              <span className="text-2xl font-bold text-success">{healthCounts.healthy}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium text-foreground">Warning</span>
              </div>
              <span className="text-2xl font-bold text-warning">{healthCounts.warning}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-foreground">Critical</span>
              </div>
              <span className="text-2xl font-bold text-destructive">{healthCounts.critical}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}