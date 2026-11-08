import { ref, onValue, off, query, limitToLast, orderByKey, set, push } from 'firebase/database';
import { db } from '../lib/firebase';
import type { Machine, Anomaly, EnergyReading } from '../data/mockData';

export interface ActivityEntry {
    id: string;
    action: string;
    time: string;
    user: string;
}

export interface CarbonEntry {
    month: string;
    carbon: number;
    target?: number;
}

export interface DepartmentEntry {
    name: string;
    consumption: number;
    percentage: number;
    color?: string;
}

export interface OptimisationEntry {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    potentialSavings: number;
    co2Reduction: number;
    implementationTime: string;
}

export interface StatsEntry {
    activeMachines: number;
    avgEfficiency: number;
    avgTemperature: number;
    co2ReductionPotential: number;
    costSavingsPotential: number;
    criticalMachines: number;
    maintenanceMachines: number;
    totalCO2: number;
    totalConsumption: number;
    totalMachines: number;
    uptime: number;
}

export const dataService = {
    // Listen to machines data
    subscribeToMachines: (callback: (data: Machine[]) => void) => {
        const machinesRef = ref(db, 'machines');
        const listener = onValue(machinesRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const machinesList = Object.entries(data).map(([key, value]: [string, any]) => ({
                id: key,
                name: value.name || `Machine ${key}`,
                serialNumber: value.serialNumber || `SN-${key}`,
                department: value.department || 'Production',
                status: value.status || 'operational',
                lastMaintenance: value.lastMaintenance ? new Date(value.lastMaintenance) : new Date(),
                activeHours: Number(value.activeHours) || 0,
                temperature: Number(value.temperature) || 0,
                consumption: Number(value.consumption) || 0,
                co2Emissions: Number(value.co2Emissions) || (Number(value.consumption || 0) * 0.45),
                efficiency: Number(value.efficiency) || 0,
            })) as Machine[];

            callback(machinesList);
        });
        return () => off(machinesRef, 'value', listener);
    },

    // Listen to anomalies
    subscribeToAnomalies: (callback: (data: Anomaly[]) => void) => {
        const anomaliesRef = ref(db, 'anomalies');
        const listener = onValue(anomaliesRef, (snapshot) => {
            const data = snapshot.val();
            const anomaliesList = data ? Object.values(data) as Anomaly[] : [];
            callback(anomaliesList);
        });
        return () => off(anomaliesRef, 'value', listener);
    },

    // Listen to energy consumption readings (energieconsumption in DB)
    subscribeToReadings: (callback: (data: EnergyReading[]) => void) => {
        const readingsRef = ref(db, 'energieconsumption');
        const listener = onValue(readingsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const readingsList = Object.entries(data).map(([key, value]: [string, any]) => ({
                timestamp: value.timestamp ? new Date(value.timestamp) : new Date(),
                machineId: value.machineId || key,
                consumption: Number(value.consumption) || 0,
                temperature: Number(value.temperature) || 0,
                co2: Number(value.co2) || 0,
            })) as EnergyReading[];

            callback(readingsList);
        });

        return () => off(readingsRef, 'value', listener);
    },

    // Update machine status (example)
    updateMachineStatus: (machineId: string, status: string) => {
        // Implementation depends on DB structure
    },

    // Listen to realtimedata1
    subscribeToRealtimeData1: (callback: (data: any) => void) => {
        const dataRef = ref(db, 'realtimedata1');
        const listener = onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            callback(data);
        });
        return () => off(dataRef, 'value', listener);
    },

    // Listen to machine history
    subscribeToMachineHistory: (machineId: string, callback: (data: HistoryEntry[]) => void, limit: number = 100) => {
        if (!machineId) {
            callback([]);
            return () => { };
        }

        const historyRef = query(
            ref(db, `history/${machineId}`),
            orderByKey(),
            limitToLast(limit)
        );

        const listener = onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const historyList = Object.entries(data).map(([key, value]: [string, any]) => ({
                timestamp: Number(key) || value.timestamp,
                consumption: Number(value.consumption) || 0,
                temperature: Number(value.temperature) || 0,
                co2Emissions: Number(value.co2Emissions) || 0,
            })).sort((a, b) => a.timestamp - b.timestamp);

            callback(historyList);
        });

        return () => off(historyRef, 'value', listener);
    },

    // Activities feed
    subscribeToActivities: (callback: (data: ActivityEntry[]) => void) => {
        const activitiesRef = ref(db, 'activities');
        const listener = onValue(activitiesRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const list = Object.entries(data).map(([id, value]: [string, any]) => ({
                id,
                action: value.action || '',
                time: value.time || '',
                user: value.user || 'System',
            }));

            callback(list);
        });

        return () => off(activitiesRef, 'value', listener);
    },

    // Carbon emission monthly dataset
    subscribeToCarbon: (callback: (data: CarbonEntry[]) => void) => {
        const carbonRef = ref(db, 'carbonemission');
        const listener = onValue(carbonRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const list: CarbonEntry[] = Object.values(data).map((value: any) => ({
                month: value.month,
                carbon: Number(value.carbon) || 0,
                target: Number(value.target) || 0,
            }));

            // Sort by calendar order Jan..Dec if possible
            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            list.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

            callback(list);
        });

        return () => off(carbonRef, 'value', listener);
    },

    // Department breakdown
    subscribeToDepartments: (callback: (data: DepartmentEntry[]) => void) => {
        const deptRef = ref(db, 'departement');
        const listener = onValue(deptRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const list: DepartmentEntry[] = Object.values(data).map((value: any) => ({
                name: value.name,
                consumption: Number(value.consumption) || 0,
                percentage: Number(value.percentage) || 0,
                color: value.color,
            }));

            callback(list);
        });

        return () => off(deptRef, 'value', listener);
    },

    // Optimisation suggestions
    subscribeToOptimisations: (callback: (data: OptimisationEntry[]) => void) => {
        const optRef = ref(db, 'optimisations');
        const listener = onValue(optRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback([]);
                return;
            }

            const list: OptimisationEntry[] = Object.entries(data).map(([key, value]: [string, any]) => ({
                id: value.id || key,
                title: value.title,
                description: value.description,
                priority: value.priority,
                status: value.status,
                potentialSavings: Number(value.potentialSavings) || 0,
                co2Reduction: Number(value.co2Reduction) || 0,
                implementationTime: value.implementationTime,
            }));

            callback(list);
        });

        return () => off(optRef, 'value', listener);
    },

    upsertOptimisation: async (entry: OptimisationEntry) => {
        try {
            if (!entry?.id) return false;
            const optRef = ref(db, `optimisations/${entry.id}`);
            await set(optRef, {
                ...entry,
                id: entry.id,
                updatedAt: new Date().toISOString(),
            });
            return true;
        } catch (error) {
            console.error('Error upserting optimisation:', error);
            return false;
        }
    },

    updateOptimisationStatus: async (id: string, status: string) => {
        try {
            if (!id) return false;
            const optRef = ref(db, `optimisations/${id}`);
            // Overwrite only status is not supported in RTDB without update(); use set with minimal merge pattern
            // We read nothing here; instead store status under its own node for simplicity.
            // To keep current DB structure, we set the status field while preserving existing fields via client-side state.
            // Callers should pass the full entry via upsertOptimisation when possible.
            await set(ref(db, `optimisations/${id}/status`), status);
            await set(ref(db, `optimisations/${id}/updatedAt`), new Date().toISOString());
            return true;
        } catch (error) {
            console.error('Error updating optimisation status:', error);
            return false;
        }
    },

    // Stats block
    subscribeToStats: (callback: (data: StatsEntry | null) => void) => {
        const statsRef = ref(db, 'stats');
        const listener = onValue(statsRef, (snapshot) => {
            const data = snapshot.val();
            callback(data || null);
        });

        return () => off(statsRef, 'value', listener);
    },

    // Save resolved anomaly to operations table
    saveOperationLog: async (machineName: string, anomalyType: string, anomalyCategory: string) => {
        try {
            const operationsRef = ref(db, 'operations');
            const newOperationRef = push(operationsRef);
            
            await set(newOperationRef, {
                machineName,
                anomalyType,
                anomalyCategory,
                status: 'resolved',
                timestamp: new Date().toISOString(),
                resolvedAt: new Date().toISOString(),
            });
            
            return true;
        } catch (error) {
            console.error('Error saving operation log:', error);
            return false;
        }
    },

    // Subscribe to operations and count resolved ones
    subscribeToOperations: (callback: (count: number) => void) => {
        const operationsRef = ref(db, 'operations');
        const listener = onValue(operationsRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                callback(0);
                return;
            }

            // Count resolved operations
            const resolvedCount = Object.values(data as any[]).filter(
                (op: any) => op.status === 'resolved'
            ).length;

            callback(resolvedCount);
        });

        return () => off(operationsRef, 'value', listener);
    },
};

export interface HistoryEntry {
    timestamp: number;
    consumption: number;
    temperature: number;
    co2Emissions: number;
}
