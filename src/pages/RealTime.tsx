import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { processRealTimeData } from '@/lib/dataUtils';
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Bell,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RealTimeMonitoring() {
  const { machines, anomalies, realtimeData1, loading } = useRealtimeData();
  const [chartData, setChartData] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);

  // Helper: Deeply extract the latest numeric value from potentially nested/historical data
  const getLatestValue = (data: any): number => {
    if (typeof data === 'number') return data;
    if (typeof data === 'string') return parseFloat(data) || 0;

    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length === 0) return 0;

      // Sort keys to find the latest (works for timestamps and Firebase push IDs)
      const sortedKeys = keys.sort();
      const latestKey = sortedKeys[sortedKeys.length - 1];
      const latestEntry = data[latestKey];

      // Recurse in case the latest entry is itself an object (e.g. { timestamp: ..., value: ... })
      return getLatestValue(latestEntry);
    }

    return 0;
  };

  // Buffer real-time data for the chart
  // Refs to hold latest data for the interval closure
  const realtimeData1Ref = useRef(realtimeData1);
  const machinesRef = useRef(machines);

  // Update refs when data changes
  useEffect(() => {
    realtimeData1Ref.current = realtimeData1;
  }, [realtimeData1]);

  useEffect(() => {
    machinesRef.current = machines;
  }, [machines]);

  // Buffer real-time data for the chart
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setChartData((prev) => {
        let newPoint: any = { time: format(new Date(), 'HH:mm:ss') };
        const currentRealtimeData = realtimeData1Ref.current;
        const currentMachines = machinesRef.current;

        if (currentRealtimeData) {
          // If realtimeData1 is an object with numeric values, use it directly
          Object.keys(currentRealtimeData).forEach(key => {
            newPoint[key] = getLatestValue(currentRealtimeData[key]);
          });
        } else if (currentMachines.length > 0) {
          // Fallback to machines logic
          currentMachines.forEach(m => {
            newPoint[m.name] = m.consumption;
          });
        }

        const newData = [...prev, newPoint];
        return newData.slice(-30); // Keep last 30 points
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Use real anomalies or fallback to empty array if undefined
  const alerts = anomalies || [];


  return (
    <Layout title="Real-time Monitoring" subtitle="Live energy consumption data">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="text-lg font-semibold text-foreground">
                Live Energy Consumption
              </h2>
              {isStreaming && (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Streaming
                </span>
              )}
            </div>
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isStreaming
                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  : 'bg-success/10 text-success hover:bg-success/20'
              )}
            >
              <RefreshCw className={cn('h-4 w-4', isStreaming && 'animate-spin')} />
              {isStreaming ? 'Pause' : 'Resume'}
            </button>
          </div>
          <EnergyLineChart
            data={chartData}
            xKey="time"
            lines={
              realtimeData1 ?
                Object.keys(realtimeData1).map((key, index) => ({
                  key: key,
                  name: key,
                  color: ['#10b981', '#3b82f6', '#eab308', '#ef4444', '#a855f7'][index % 5],
                  strokeWidth: 2
                }))
                :
                [
                  { key: 'CNC-01', name: 'CNC-01', color: '#10b981', strokeWidth: 2 },
                  { key: 'Robot-02', name: 'Robot-02', color: '#3b82f6', strokeWidth: 2 },
                  { key: 'Conveyor-03', name: 'Conveyor-03', color: '#eab308', strokeWidth: 2 },
                  { key: 'Compressor-04', name: 'Compressor-04', color: '#ef4444', strokeWidth: 2 },
                  { key: 'Furnace-05', name: 'Furnace-05', color: '#a855f7', strokeWidth: 2 },
                ]}
            height={400}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Machine Status */}
          <div className="glass-card p-6 rounded-xl border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Machine Status
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {machines.map((machine) => (
                <div
                  key={machine.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full',
                        machine.status === 'operational'
                          ? 'bg-success'
                          : machine.status === 'maintenance'
                            ? 'bg-warning'
                            : 'bg-destructive animate-pulse'
                      )}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {machine.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-3.5 w-3.5" />
                    {machine.consumption.toFixed(1)} kWh
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Alerts */}
          <div className="glass-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold text-foreground">
                Real-time Alerts
              </h2>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  All systems operating normally
                </div>
              ) : (
                alerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border',
                      alert.type === 'critical'
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-warning/10 border-warning/30'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {alert.type === 'critical' ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm text-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence: {(alert.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
