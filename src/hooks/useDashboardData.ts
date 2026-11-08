import { useEffect, useState } from 'react';
import { dataService, type ActivityEntry, type CarbonEntry, type DepartmentEntry, type OptimisationEntry, type StatsEntry } from '@/services/dataService';

interface DashboardData {
  carbon: CarbonEntry[];
  departments: DepartmentEntry[];
  stats: StatsEntry | null;
  activities: ActivityEntry[];
  optimisations: OptimisationEntry[];
  loading: boolean;
}

export function useDashboardData(): DashboardData {
  const [carbon, setCarbon] = useState<CarbonEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentEntry[]>([]);
  const [stats, setStats] = useState<StatsEntry | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [optimisations, setOptimisations] = useState<OptimisationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCarbon = dataService.subscribeToCarbon((data) => {
      setCarbon(data);
      setLoading(false);
    });

    const unsubDept = dataService.subscribeToDepartments(setDepartments);
    const unsubStats = dataService.subscribeToStats(setStats);
    const unsubActivities = dataService.subscribeToActivities(setActivities);
    const unsubOpt = dataService.subscribeToOptimisations(setOptimisations);

    return () => {
      unsubCarbon();
      unsubDept();
      unsubStats();
      unsubActivities();
      unsubOpt();
    };
  }, []);

  return { carbon, departments, stats, activities, optimisations, loading };
}
