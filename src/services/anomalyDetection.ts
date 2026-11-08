import type { Machine, EnergyReading, Anomaly } from '@/data/mockData';
import { llmService } from './llmService';

// Statistical Anomaly Detection (Isolation Forest Logic simplified for Client-Side)
type AnomalyClass = 0 | 1;

interface PredictionResult {
  predictedClass: AnomalyClass;
  anomalyType: 'critical' | 'warning' | null;
  category: 'temperature' | 'consumption' | 'efficiency' | 'pattern' | null;
  confidence: number;
  description: string | null;
  detailedAnalysis: string | null;
  features: {
    tempZScore: number;
    consZScore: number;
    efficiency: number;
  };
}

// Calculate Z-Score: (Value - Mean) / StdDev
function calculateZScore(value: number, history: number[]): number {
  if (history.length < 2) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / history.length;
  const std = Math.sqrt(variance);
  return std === 0 ? 0 : (value - mean) / std;
}

export function predictAnomaly(
  machine: Machine,
  readings: EnergyReading[]
): PredictionResult {
  const machineReadings = readings.filter(r => r.machineId === machine.id || r.machineId === machine.name);
  
  // Need at least minimal history for statistical relevance
  if (machineReadings.length < 3) {
    return {
      predictedClass: 0,
      anomalyType: null,
      category: null,
      confidence: 0,
      description: "Insufficient data for prediction",
      detailedAnalysis: null,
      features: { tempZScore: 0, consZScore: 0, efficiency: machine.efficiency }
    };
  }

  // Feature Extraction
  const consumptions = machineReadings.map(r => r.consumption);
  const temperatures = machineReadings.map(r => r.temperature);
  
  const currentCons = machine.consumption;
  const currentTemp = machine.temperature;

  const consZ = calculateZScore(currentCons, consumptions);
  const tempZ = calculateZScore(currentTemp, temperatures);

  // Model Logic (Threshold-based Classifier)
  const TEMP_ZC_THRESHOLD = 2.5;
  const CONS_ZC_THRESHOLD = 3.0;
  const EFFICIENCY_THRESHOLD = 85;

  let predictedClass: AnomalyClass = 0;
  let anomalyType: 'critical' | 'warning' | null = null;
  let category: 'temperature' | 'consumption' | 'efficiency' | 'pattern' | null = null;
  let description: string | null = null;
  let confidence = 0;

  // 1. Temperature Check
  if (Math.abs(tempZ) > TEMP_ZC_THRESHOLD || currentTemp > 90) {
    predictedClass = 1;
    confidence = Math.min(Math.abs(tempZ) / 4, 0.99);
    anomalyType = currentTemp > 95 ? 'critical' : 'warning';
    category = 'temperature';
    description = `Temperature Anomaly: ${currentTemp.toFixed(1)}°C (Z-Score: ${tempZ.toFixed(2)})`;
  }
  // 2. Efficiency Check (Priority)
  else if (machine.efficiency < EFFICIENCY_THRESHOLD) {
    predictedClass = 1;
    confidence = (100 - machine.efficiency) / 100;
    anomalyType = machine.efficiency < 70 ? 'critical' : 'warning';
    category = 'efficiency';
    description = `Low Efficiency Detected: ${machine.efficiency.toFixed(1)}%`;
  }
  // 3. Consumption Spike Check
  else if (Math.abs(consZ) > CONS_ZC_THRESHOLD) {
    predictedClass = 1;
    confidence = Math.min(Math.abs(consZ) / 5, 0.95);
    anomalyType = 'warning';
    category = 'consumption';
    description = `Abnormal Consumption Pattern: ${consZ.toFixed(2)}σ deviation`;
  }

  return {
    predictedClass,
    anomalyType,
    category,
    confidence,
    description,
    detailedAnalysis: null,
    features: {
      tempZScore: tempZ,
      consZScore: consZ,
      efficiency: machine.efficiency
    }
  };
}

export async function analyzeAnomalyWithLLM(
  machine: Machine,
  readings: EnergyReading[],
  anomaly: {
    category: string | null;
    type: string | null;
    confidence: number;
  }
): Promise<string | null> {
    try {
      if (!anomaly.category) return null;

      const currentTemp = machine.temperature;
      const currentCons = machine.consumption;
      
      const analysisPrompt = `You are an expert industrial machine diagnostician. Analyze this machine anomaly and provide a brief, actionable diagnosis:

Machine: ${machine.name}
Issue Type: ${anomaly.category}
Current Value: ${anomaly.category === 'temperature' ? currentTemp.toFixed(1) + '°C' : anomaly.category === 'consumption' ? currentCons.toFixed(1) + ' kWh' : machine.efficiency.toFixed(1) + '%'}
Severity: ${anomaly.type}
Confidence: ${(anomaly.confidence * 100).toFixed(0)}%

Provide:
1. Root cause analysis (1-2 sentences)
2. Recommended action (1 sentence)
3. Urgency level

Keep it concise and actionable.`;

      const machineReadings = readings.filter(r => r.machineId === machine.id || r.machineId === machine.name);
      
      const detailedResult = await llmService.getResponse(
        analysisPrompt,
        [machine],
        [],
        machineReadings.slice(-10)
      );

      return detailedResult || null;
    } catch (error) {
      console.error('LLM analysis error:', error);
      return null;
    }
}
