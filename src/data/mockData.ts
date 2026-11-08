import { addDays, subDays, subHours, format } from 'date-fns';

export interface Machine {
  id: string;
  name: string;
  serialNumber: string;
  department: Department;
  status: 'operational' | 'maintenance' | 'critical';
  lastMaintenance: Date;
  activeHours: number;
  temperature: number;
  consumption: number;
  co2Emissions: number;
  efficiency: number;
}

export type Department = 'Production' | 'Assembly' | 'Packaging' | 'Warehouse' | 'Office' | 'Utility';

export interface EnergyReading {
  timestamp: Date;
  machineId: string;
  consumption: number;
  temperature: number;
  co2: number;
}

export interface Anomaly {
  id: string;
  machineId: string;
  machineName: string;
  timestamp: Date;
  type: 'critical' | 'warning';
  confidence: number;
  description: string;
  resolved: boolean;
  category: 'temperature' | 'consumption' | 'efficiency' | 'pattern';
  detailedAnalysis?: string;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  metric?: string;
  change?: number;
}

const departments: Department[] = ['Production', 'Assembly', 'Packaging', 'Warehouse', 'Office', 'Utility'];
const machineTypes = ['CNC', 'Robot', 'Conveyor', 'Compressor', 'Furnace', 'Press', 'Mixer', 'Dryer'];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate 15 machines
export const machines: Machine[] = Array.from({ length: 15 }, (_, i) => {
  const department = departments[i % 5];
  const machineType = machineTypes[i % 8];
  const status: Machine['status'] = i === 3 ? 'critical' : i === 7 ? 'maintenance' : 'operational';

  return {
    id: `M${String(i + 1).padStart(3, '0')}`,
    name: `${machineType}-${String(i + 1).padStart(2, '0')}`,
    serialNumber: `SN-${2024}${String(i + 1).padStart(4, '0')}`,
    department,
    status,
    lastMaintenance: subDays(new Date(), randomInt(1, 90)),
    activeHours: randomInt(1200, 8760),
    temperature: status === 'critical' ? randomBetween(55, 65) : randomBetween(32, 48),
    consumption: randomBetween(30, 60),
    co2Emissions: 0,
    efficiency: status === 'critical' ? randomBetween(60, 75) : randomBetween(82, 98),
  };
}).map(m => ({
  ...m,
  co2Emissions: m.consumption * 0.45,
}));

// Generate historical energy data
export function generateEnergyData(hours: number = 24): EnergyReading[] {
  const readings: EnergyReading[] = [];
  const now = new Date();

  for (let h = hours - 1; h >= 0; h--) {
    const timestamp = subHours(now, h);
    machines.forEach(machine => {
      const baseConsumption = machine.consumption;
      const variation = Math.sin(h / 4) * 10 + randomBetween(-5, 5);

      readings.push({
        timestamp,
        machineId: machine.id,
        consumption: Math.max(20, baseConsumption + variation),
        temperature: machine.temperature + randomBetween(-3, 3),
        co2: (baseConsumption + variation) * 0.45,
      });
    });
  }

  return readings;
}

// Generate monthly data for charts
export function generateMonthlyData(months: number = 12) {
  const data = [];
  const now = new Date();

  for (let m = months - 1; m >= 0; m--) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 1);
    data.push({
      month: format(date, 'MMM'),
      date: format(date, 'yyyy-MM-dd'),
      consumption: randomBetween(45000, 65000),
      production: randomBetween(48000, 62000),
      assembly: randomBetween(28000, 38000),
      packaging: randomBetween(15000, 22000),
      warehouse: randomBetween(8000, 12000),
      office: randomBetween(5000, 8000),
      carbon: randomBetween(20000, 32000),
      cost: randomBetween(18000, 25000),
    });
  }

  return data;
}

// Generate hourly data for real-time charts
export function generateHourlyData(hours: number = 24) {
  const data = [];
  const now = new Date();

  for (let h = hours - 1; h >= 0; h--) {
    const time = subHours(now, h);
    data.push({
      time: format(time, 'HH:mm'),
      total: randomBetween(180, 280),
      production: randomBetween(80, 120),
      assembly: randomBetween(40, 70),
      packaging: randomBetween(20, 40),
      warehouse: randomBetween(15, 30),
      office: randomBetween(10, 20),
    });
  }

  return data;
}

// Generate anomalies
export const anomalies: Anomaly[] = [
  {
    id: 'A001',
    machineId: 'M004',
    machineName: 'Compressor-04',
    timestamp: subHours(new Date(), 2),
    type: 'critical',
    confidence: 0.94,
    description: 'Unusual temperature spike detected. Temperature exceeded 60°C threshold.',
    resolved: false,
    category: 'temperature',
  },
  {
    id: 'A002',
    machineId: 'M008',
    machineName: 'Press-08',
    timestamp: subHours(new Date(), 5),
    type: 'warning',
    confidence: 0.87,
    description: 'Energy consumption 35% higher than baseline. Possible efficiency degradation.',
    resolved: false,
    category: 'consumption',
  },
  {
    id: 'A003',
    machineId: 'M012',
    machineName: 'Mixer-12',
    timestamp: subHours(new Date(), 8),
    type: 'warning',
    confidence: 0.79,
    description: 'Irregular consumption pattern detected during idle periods.',
    resolved: true,
    category: 'pattern',
  },
  {
    id: 'A004',
    machineId: 'M003',
    machineName: 'Conveyor-03',
    timestamp: subDays(new Date(), 1),
    type: 'warning',
    confidence: 0.82,
    description: 'Efficiency dropped below 80% threshold.',
    resolved: true,
    category: 'efficiency',
  },
  {
    id: 'A005',
    machineId: 'M015',
    machineName: 'Dryer-15',
    timestamp: subDays(new Date(), 2),
    type: 'critical',
    confidence: 0.91,
    description: 'Critical temperature fluctuation detected. Immediate inspection recommended.',
    resolved: true,
    category: 'temperature',
  },
];

// AI Insights
export const insights: Insight[] = [
  {
    id: '1',
    title: 'Peak Efficiency Hours',
    description: 'Production line efficiency peaks between 10 AM - 2 PM. Consider scheduling high-energy tasks during this window.',
    type: 'positive',
    metric: 'Efficiency',
    change: 12,
  },
  {
    id: '2',
    title: 'Weekend Consumption Alert',
    description: 'Weekend energy usage is 40% higher than necessary. Implement automated shutdown protocols.',
    type: 'negative',
    metric: 'Consumption',
    change: -40,
  },
  {
    id: '3',
    title: 'Carbon Reduction Opportunity',
    description: 'Switching to off-peak hours for non-critical processes could reduce carbon footprint by 15%.',
    type: 'neutral',
    metric: 'CO₂',
    change: 15,
  },
  {
    id: '4',
    title: 'Maintenance Prediction',
    description: 'CNC-01 shows signs of degradation. Schedule preventive maintenance within 2 weeks.',
    type: 'negative',
  },
];

// Optimization suggestions
export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  potentialSavings: number;
  co2Reduction: number;
  implementationTime: string;
  status: 'pending' | 'in-progress' | 'implemented';
}

export const optimizationSuggestions: OptimizationSuggestion[] = [
  {
    id: 'O001',
    title: 'Optimize Compressor Scheduling',
    description: 'Run compressors during off-peak hours to reduce energy costs by up to 25%.',
    priority: 'high',
    potentialSavings: 4500,
    co2Reduction: 2250,
    implementationTime: '1-2 weeks',
    status: 'pending',
  },
  {
    id: 'O002',
    title: 'Install Variable Frequency Drives',
    description: 'VFDs on conveyor motors can reduce energy consumption by 30%.',
    priority: 'high',
    potentialSavings: 6800,
    co2Reduction: 3400,
    implementationTime: '2-4 weeks',
    status: 'in-progress',
  },
  {
    id: 'O003',
    title: 'Implement Power Factor Correction',
    description: 'Improve power factor from 0.85 to 0.95 to reduce reactive power charges.',
    priority: 'medium',
    potentialSavings: 2200,
    co2Reduction: 1100,
    implementationTime: '1 week',
    status: 'pending',
  },
  {
    id: 'O004',
    title: 'LED Lighting Upgrade',
    description: 'Replace warehouse lighting with LED fixtures for 60% energy savings.',
    priority: 'medium',
    potentialSavings: 1800,
    co2Reduction: 900,
    implementationTime: '2-3 weeks',
    status: 'implemented',
  },
  {
    id: 'O005',
    title: 'Smart HVAC Controls',
    description: 'Install smart thermostats and occupancy sensors in office areas.',
    priority: 'low',
    potentialSavings: 1200,
    co2Reduction: 600,
    implementationTime: '1 week',
    status: 'pending',
  },
];

// Department consumption breakdown
export const departmentBreakdown = departments.map(dept => ({
  name: dept,
  consumption: randomBetween(8000, 35000),
  percentage: 0,
  color: dept === 'Production' ? '#10b981' :
    dept === 'Assembly' ? '#3b82f6' :
      dept === 'Packaging' ? '#eab308' :
        dept === 'Warehouse' ? '#a855f7' : '#6b7280',
}));

const totalConsumption = departmentBreakdown.reduce((sum, d) => sum + d.consumption, 0);
departmentBreakdown.forEach(d => {
  d.percentage = Math.round((d.consumption / totalConsumption) * 100);
});

// Calculate KPIs
export function calculateMachineMetrics(machinesList: Machine[]) {
  const totalConsumption = machinesList.reduce((sum, m) => sum + m.consumption * (m.activeHours || 0) / 100, 0);
  const avgEfficiency = machinesList.length > 0 ? machinesList.reduce((sum, m) => sum + m.efficiency, 0) / machinesList.length : 0;
  const totalCO2 = totalConsumption * 0.45;
  const activeMachines = machinesList.filter(m => m.status === 'operational').length;

  return {
    totalConsumption: Math.round(totalConsumption),
    avgEfficiency: Math.round(avgEfficiency * 10) / 10,
    totalCO2: Math.round(totalCO2),
    activeMachines,
    totalMachines: machinesList.length,
    criticalMachines: machinesList.filter(m => m.status === 'critical').length,
    maintenanceMachines: machinesList.filter(m => m.status === 'maintenance').length,
    avgTemperature: machinesList.length > 0 ? Math.round(machinesList.reduce((sum, m) => sum + m.temperature, 0) / machinesList.length * 10) / 10 : 0,
    uptime: 98.5,
    costSavingsPotential: 48500,
    co2ReductionPotential: 7800,
  };
}

export function calculateKPIs() {
  return calculateMachineMetrics(machines);
}
