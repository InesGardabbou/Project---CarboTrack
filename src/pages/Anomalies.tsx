import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { EnergyBarChart } from '@/components/charts/EnergyBarChart';
import { useAppStore } from '@/store/appStore';
import { dataService } from '@/services/dataService';
import { format, startOfDay, differenceInDays } from 'date-fns';
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  TrendingDown,
  Eye,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { analyzeAnomalyWithLLM } from '@/services/anomalyDetection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function AnomalyDetection() {
  const { resolveAnomaly, anomalies: storeAnomalies, readings, machines } = useAppStore();
  const [firebaseResolvedCount, setFirebaseResolvedCount] = useState(0);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Filter to show ONLY real-time AI-detected anomalies (from Firebase via predictAnomaly)
  const aiAnomalies = useMemo(() => 
    storeAnomalies.filter(a => a.id.startsWith('ai-')),
    [storeAnomalies]
  );

  // Subscribe to Firebase operations table on mount
  useEffect(() => {
    const unsubscribe = dataService.subscribeToOperations((count) => {
      setFirebaseResolvedCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute anomaly chart data from real readings
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) {
      return [];
    }

    // Sort by timestamp
    const sorted = [...readings]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-30); // Last 30 points

    return sorted.map(r => {
      // Check if this reading corresponds to a known AI anomaly
      const isAnomaly = aiAnomalies.some(a => 
        (a.machineId === r.machineId) && 
        Math.abs(new Date(a.timestamp).getTime() - new Date(r.timestamp).getTime()) < 5 * 60000 // 5 min window
      );

      return {
        time: format(new Date(r.timestamp), 'HH:mm:ss'),
        consumption: r.consumption,
        anomaly: isAnomaly ? r.consumption : null,
        threshold: 75,
      };
    });
  }, [readings, aiAnomalies]);

  // Compute anomaly trends from real data (last 7 days)
  const anomalyTrends = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trends = days.map((day, idx) => {
      const dayIndex = (new Date().getDay() - (6 - idx) + 7) % 7;
      return { day, critical: 0, warning: 0 };
    });

    // Count anomalies by day
    aiAnomalies.forEach(a => {
      const aDate = new Date(a.timestamp);
      const dayDiff = differenceInDays(new Date(), startOfDay(aDate));
      if (dayDiff >= 0 && dayDiff < 7) {
        const dayIndex = 6 - dayDiff;
        if (trends[dayIndex]) {
          if (a.type === 'critical') {
            trends[dayIndex].critical++;
          } else {
            trends[dayIndex].warning++;
          }
        }
      }
    });

    return trends;
  }, [aiAnomalies]);

  // KPI counts based on REAL AI-detected anomalies only
  const criticalCount = aiAnomalies.filter((a) => a.type === 'critical' && !a.resolved).length;
  const warningCount = aiAnomalies.filter((a) => a.type === 'warning' && !a.resolved).length;
  const resolvedCount = firebaseResolvedCount; // Use Firebase operations count instead of local state
  const totalAnomalies = aiAnomalies.length;

  return (
    <Layout title="Anomaly Detection" subtitle="AI-powered anomaly identification">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Anomalies"
          value={totalAnomalies}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={-15}
          trendLabel="vs last week"
          variant="warning"
        />
        <KPICard
          title="Critical Anomalies"
          value={criticalCount}
          icon={<XCircle className="h-5 w-5" />}
          variant="destructive"
        />
        <KPICard
          title="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={25}
          trendLabel="this week"
          variant="success"
        />
        <KPICard
          title="Anomaly Trend"
          value={totalAnomalies > 0 ? (resolvedCount / totalAnomalies * 100).toFixed(0) + '%' : '0%'}
          icon={<TrendingDown className="h-5 w-5" />}
          subtitle="resolved rate"
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Anomaly Alerts - Machines with Anomalies */}
        <div className="lg:col-span-1 glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">
              Affected Machines
            </h2>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
            {aiAnomalies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">✅ No anomalies. All machines nominal.</p>
            ) : (
            aiAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  anomaly.resolved
                    ? 'bg-muted/30 border-border/50 opacity-60'
                    : anomaly.type === 'critical'
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-warning/10 border-warning/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {anomaly.type === 'critical' ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    ) : anomaly.resolved ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {anomaly.machineName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {anomaly.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: {anomaly.category} • {(anomaly.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  {!anomaly.resolved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        // Save to operations table in Firebase
                        await dataService.saveOperationLog(
                          anomaly.machineName,
                          anomaly.type,
                          anomaly.category
                        );
                        // Resolve in local state
                        resolveAnomaly(anomaly.id);
                      }}
                      className="text-success hover:text-success hover:bg-success/10 text-xs h-6 px-2"
                    >
                      Resolve
                    </Button>
                  )}
                  {/* View Details Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      setSelectedAnomaly(anomaly);
                      setShowDetailsDialog(true);
                      
                      // Fetch analysis if not present
                      if (!anomaly.detailedAnalysis) {
                        setAnalysisLoading(true);
                        const machine = machines.find(m => m.id === anomaly.machineId || m.name === anomaly.machineName);
                        if (machine) {
                           const analysis = await analyzeAnomalyWithLLM(machine, readings, anomaly);
                           if (analysis) {
                             setSelectedAnomaly(prev => ({ ...prev, detailedAnalysis: analysis }));
                           }
                        }
                        setAnalysisLoading(false);
                      }
                    }}
                    className="text-primary hover:text-primary hover:bg-primary/10 text-xs h-6 px-2"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
            )}
          </div>
        </div>

        {/* Anomaly Detection Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Anomaly Detection
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-chart-green" />
                <span className="text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Anomaly</span>
              </div>
            </div>
          </div>
          <EnergyLineChart
            data={chartData}
            xKey="time"
            lines={[
              { key: 'consumption', name: 'Consumption', color: '#10b981', strokeWidth: 2 },
              { key: 'anomaly', name: 'Anomaly', color: '#ef4444', strokeWidth: 3 },
            ]}
            height={320}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Anomaly Trends - Real-time Data */}
        <div className="glass-card p-6 rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Anomaly Trends (7 Days)
          </h2>
          <EnergyBarChart
            data={anomalyTrends}
            xKey="day"
            bars={[
              { key: 'critical', name: 'Critical', color: '#ef4444' },
              { key: 'warning', name: 'Warning', color: '#eab308' },
            ]}
            height={320}
          />
        </div>
      </div>

      {/* Details Dialog - Show Gemini's Analysis */}
      {selectedAnomaly && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Anomaly Analysis: {selectedAnomaly.machineName}</DialogTitle>
              <DialogDescription>
                AI-generated insights from Gemini
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
              <h4 className="text-sm font-semibold mb-2">Issue Type</h4>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  selectedAnomaly.type === 'critical'
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-warning/20 text-warning'
                )}>
                  {selectedAnomaly.type.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">
                  {selectedAnomaly.category} • {(selectedAnomaly.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Quick Diagnosis</h4>
              <p className="text-sm text-muted-foreground">
                {selectedAnomaly.description}
              </p>
            </div>

            {analysisLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                 <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                 <p className="text-sm text-muted-foreground">Analysing anomaly with Gemini AI...</p>
              </div>
            ) : selectedAnomaly.detailedAnalysis ? (
              <div>
                <h4 className="text-sm font-semibold mb-2">Detailed Analysis</h4>
                <div className="bg-muted/50 p-3 rounded-lg border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedAnomaly.detailedAnalysis}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                 <p className="text-sm text-muted-foreground">Analysis not available.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </Layout>
  );
}
