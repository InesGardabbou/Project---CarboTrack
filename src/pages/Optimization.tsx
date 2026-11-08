import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { KPICard } from '@/components/KPICard';
import { EnergyLineChart } from '@/components/charts/EnergyLineChart';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import {
  Sparkles,
  DollarSign,
  Leaf,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { optimizationService } from '@/services/optimizationService';

function buildLast12MonthsConsumption(readings: { timestamp: Date | string; consumption: number }[]) {
  const now = new Date();
  const months: { key: string; label: string; total: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    months.push({ key, label, total: 0 });
  }

  const byKey = new Map(months.map(m => [m.key, m]));
  for (const r of readings) {
    const dt = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const slot = byKey.get(key);
    if (slot) slot.total += Number(r.consumption) || 0;
  }

  return months.map(m => ({ month: m.label, consumption: m.total }));
}

export default function Optimization() {
  const { machines, readings } = useRealtimeData();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = optimizationService.subscribe((data) => {
      setSuggestions(data);
    });
    return () => unsubscribe();
  }, []);

  const handleImplement = (id: string) => {
    // Persist status to Firebase (real-time sync)
    optimizationService.setStatus(id, 'in-progress');
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      await optimizationService.generateAndSaveFromLLM(machines, readings);
    } catch (e) {
      console.error('Generate AI recommendations failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
  const inProgressCount = suggestions.filter((s) => s.status === 'in-progress').length;
  const implementedCount = suggestions.filter((s) => s.status === 'implemented').length;

  const totalSavings = suggestions.reduce((sum, s) => sum + (Number(s.potentialSavings) || 0), 0);
  const totalCO2Reduction = suggestions.reduce((sum, s) => sum + (Number(s.co2Reduction) || 0), 0);

  const monthlyData = useMemo(() => {
    const base = buildLast12MonthsConsumption(readings);
    // Simple projection: assume 10% reduction if all pending/in-progress implemented
    const reductionFactor = Math.min(0.25, 0.10 + (implementedCount * 0.01));
    return base.map((d) => ({
      ...d,
      actual: d.consumption,
      optimized: d.consumption * (1 - reductionFactor),
    }));
  }, [readings, implementedCount]);

  return (
    <Layout title="Optimization" subtitle="AI-powered optimization recommendations">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Potential Savings"
          value={`${(totalSavings).toLocaleString()} DT`}
          subtitle={`${pendingCount} pending, ${inProgressCount} in progress`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="default"
        />
        <KPICard
          title="Optimization Suggestions"
          value={suggestions.length}
          subtitle={`${pendingCount} pending, ${inProgressCount} in progress`}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <KPICard
          title="Potential CO₂ Reduction"
          value={`${(totalCO2Reduction / 1000).toFixed(1)}t`}
          subtitle="Per year"
          icon={<Leaf className="h-5 w-5" />}
          variant="success"
        />
        <KPICard
          title="Efficiency Improvement"
          value="+18%"
          subtitle="If all implemented"
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Optimization Suggestions */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Optimization Suggestions
            </h2>
          </div>
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  suggestion.status === 'implemented'
                    ? 'bg-success/5 border-success/30'
                    : suggestion.status === 'in-progress'
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/50 border-border/50 hover:border-primary/30'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-foreground">
                        {suggestion.title}
                      </h3>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          suggestion.priority === 'high'
                            ? 'bg-destructive/10 text-destructive'
                            : suggestion.priority === 'medium'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {suggestion.priority}
                      </span>
                      {suggestion.status === 'implemented' && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Implemented
                        </span>
                      )}
                      {suggestion.status === 'in-progress' && (
                        <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                          <Clock className="h-3 w-3" />
                          In Progress
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-success">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {suggestion.potentialSavings.toLocaleString()} DT/yr
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary">
                        <Leaf className="h-4 w-4" />
                        <span className="font-medium">
                          {suggestion.co2Reduction.toLocaleString()} kg CO₂
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{suggestion.implementationTime}</span>
                      </div>
                    </div>
                  </div>
                  {suggestion.status === 'pending' && (
                    <Button
                      onClick={() => handleImplement(suggestion.id)}
                      className="gap-2 shrink-0"
                    >
                      Implement
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Implementation Status */}
          <div className="glass-card p-6 rounded-xl border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Implementation Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-xl font-bold text-foreground">
                  {pendingCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                <span className="text-sm text-muted-foreground">In Progress</span>
                <span className="text-xl font-bold text-primary">
                  {inProgressCount}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                <span className="text-sm text-muted-foreground">Implemented</span>
                <span className="text-xl font-bold text-success">
                  {implementedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6 rounded-xl border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Run Optimization Analysis
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleGenerateAI}
                disabled={aiLoading}
              >
                <Sparkles className="h-4 w-4 text-warning" />
                {aiLoading ? 'Generating…' : 'Generate AI Recommendations'}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                View Savings Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Consumption Comparison Chart */}
      <div className="glass-card p-6 rounded-xl border border-border mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Energy Consumption: Actual vs Optimized
        </h2>
        <EnergyLineChart
          data={monthlyData}
          xKey="month"
          lines={[
            { key: 'actual', name: 'Actual Consumption', color: '#6b7280', strokeWidth: 2 },
            { key: 'optimized', name: 'Optimized (Projected)', color: '#10b981', strokeWidth: 2 },
          ]}
          height={300}
        />
      </div>
    </Layout>
  );
}
