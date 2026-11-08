import { useState, useEffect } from 'react';
import { dataService, HistoryEntry } from '../services/dataService';
import { Machine, Anomaly, EnergyReading } from '../data/mockData';
import { getLatestValue } from '../lib/dataUtils';
import { predictAnomaly } from '../services/anomalyDetection';

export function useRealtimeData(selectedMachineId?: string) {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [dbAnomalies, setDbAnomalies] = useState<Anomaly[]>([]); // Renamed from specific subscription
    const [readings, setReadings] = useState<EnergyReading[]>([]);
    const [realtimeData1, setRealtimeData1] = useState<any>(null);
    const [mergedMachines, setMergedMachines] = useState<Machine[]>([]);
    const [aiAnomalies, setAiAnomalies] = useState<Anomaly[]>([]); // AI Detected locally
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to data
        const unsubscribeMachines = dataService.subscribeToMachines((data) => {
            setMachines(data);
            setLoading(false);
        });

        const unsubscribeAnomalies = dataService.subscribeToAnomalies((data) => {
            setDbAnomalies(data);
        });

        const unsubscribeReadings = dataService.subscribeToReadings((data) => {
            setReadings(data);
        });

        const unsubscribeRealtimeData1 = dataService.subscribeToRealtimeData1((data) => {
            setRealtimeData1(data);
        });

        return () => {
            unsubscribeMachines();
            unsubscribeAnomalies();
            unsubscribeReadings();
            unsubscribeRealtimeData1();
        };
    }, []);

    // Subscribe to history when selectedMachineId changes
    useEffect(() => {
        if (!selectedMachineId || selectedMachineId === 'all') {
            setHistory([]);
            return;
        }

        const unsubscribeHistory = dataService.subscribeToMachineHistory(selectedMachineId, (data) => {
            setHistory(data);
        });

        return () => {
            unsubscribeHistory();
        };
    }, [selectedMachineId]);


    // Merge static machines with dynamically discovered machines and update values
    useEffect(() => {
        // Base machines (initially from DB machines node)
        const baseMachines = machines || [];
        const knownMachineNames = new Set(baseMachines.map(m => m.name));

        let dynamicMachines: Machine[] = [];
        if (realtimeData1) {
            const keys = Object.keys(realtimeData1);
            keys.forEach(key => {
                if (!knownMachineNames.has(key)) {
                    // Discovered new machine
                    dynamicMachines.push({
                        id: key, // Use key as ID for dynamic machines
                        name: key,
                        status: 'operational',
                        consumption: getLatestValue(realtimeData1[key]),
                        serialNumber: `AUTO-${key}`,
                        department: 'Production', // Default valid department
                        activeHours: 0,
                        lastMaintenance: new Date(),
                        temperature: 40,
                        co2Emissions: 0,
                        efficiency: 100 // Default efficiency
                    });
                }
            });
        }

        // Combine
        const all = [...baseMachines, ...dynamicMachines];

        // Update consumption for ALL machines using latest realtimeData1
        const updated = all.map(m => {
            if (realtimeData1 && realtimeData1[m.name] !== undefined) {
                return {
                    ...m,
                    consumption: getLatestValue(realtimeData1[m.name])
                };
            }
            return m;
        });

        setMergedMachines(updated);

        // Run AI Anomaly Detection on the updated machines vs available readings
        if (updated.length > 0) {
            const detected: Anomaly[] = [];
            updated.forEach(m => {
                const result = predictAnomaly(m, readings);
                if (result.predictedClass === 1) {
                    detected.push({
                        id: `ai-${m.id}`,
                        machineId: m.id,
                        machineName: m.name,
                        timestamp: new Date(),
                        type: result.anomalyType || 'warning',
                        confidence: result.confidence,
                        description: result.description || 'Abnormal behavior detected',
                        resolved: false,
                        category: result.category || 'pattern',
                        detailedAnalysis: undefined
                    });
                }
            });
            setAiAnomalies(detected);
        }

    }, [machines, realtimeData1, readings]); // Added readings dependency

    // Merge DB anomalies and AI anomalies
    // Prefer AI anomalies for real-time status, but keep DB tracked ones
    const combinedAnomalies = [...dbAnomalies, ...aiAnomalies.filter(ai => !dbAnomalies.find(db => db.machineId === ai.machineId && !db.resolved))];

    return { machines: mergedMachines, anomalies: combinedAnomalies, readings, realtimeData1, history, loading };
}
