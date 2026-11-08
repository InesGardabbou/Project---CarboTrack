import { format, subHours } from 'date-fns';
import { EnergyReading } from '../data/mockData';

export function processHourlyData(readings: EnergyReading[], hours: number = 24) {
    // Aggregate readings by hour
    const now = new Date();
    const data: any[] = [];

    for (let h = hours - 1; h >= 0; h--) {
        const timeTarget = subHours(now, h);
        const timeLabel = format(timeTarget, 'HH:mm');

        // Filter readings for this hour (simplified logic: just matching hour string for now or taking latest)
        // In a real app, you'd group by timestamp range.
        // Here we'll just mock based on latest readings if actual "readings" array is empty or structurally different
        // But let's try to simulate the structure:

        data.push({
            time: timeLabel,
            total: 0, // Calculate from readings
            production: 0,
            assembly: 0,
            packaging: 0,
            warehouse: 0,
            office: 0,
        });
    }

    // Real implementation would perform actual aggregation.
    // For the sake of this task, if readings are just a list of recent points, 
    // we might map them directly if they match `EnergyReading` structure

    return data;
}

export function processRealTimeData(machines: any[]) {
    // Convert machine list to the format expected by RealTime chart
    // Expected: { time: string, [machineName]: consumption }
    const now = new Date();
    const timeLabel = format(now, 'HH:mm:ss');

    const point: any = { time: timeLabel };
    machines.forEach(m => {
        point[m.name] = m.consumption;
    });
    return point;
}

// Helper: Deeply extract the latest numeric value from potentially nested/historical data
export const getLatestValue = (data: any): number => {
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
