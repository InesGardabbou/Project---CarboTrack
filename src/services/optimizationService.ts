import type { Machine, EnergyReading } from '@/data/mockData';
import type { OptimisationEntry } from '@/services/dataService';
import { dataService } from '@/services/dataService';
import { llmService } from '@/services/llmService';

function extractJsonArray(text: string): unknown {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in LLM response');
  }
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function normalizePriority(value: unknown): 'high' | 'medium' | 'low' {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('high')) return 'high';
  if (v.includes('medium')) return 'medium';
  if (v.includes('low')) return 'low';
  // french fallbacks
  if (v.includes('haute')) return 'high';
  if (v.includes('moy')) return 'medium';
  if (v.includes('basse')) return 'low';
  return 'medium';
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export const optimizationService = {
  subscribe: dataService.subscribeToOptimisations,

  async setStatus(id: string, status: 'pending' | 'in-progress' | 'implemented') {
    return dataService.updateOptimisationStatus(id, status);
  },

  async generateAndSaveFromLLM(machines: Machine[], readings: EnergyReading[]) {
    // Keep prompt short but structured.
    const prompt = `Generate 5-10 concrete industrial energy optimization recommendations based on the CURRENT SYSTEM STATE.

Return ONLY a valid JSON array. No markdown.
Each item must include:
- title (string)
- description (string)
- priority (high|medium|low)
- potentialSavings (number, DT per year)
- co2Reduction (number, kg CO2 per year)
- implementationTime (string, e.g. "2 weeks")

Do NOT include id/status; the app will assign them.`;

    const llmText = await llmService.getResponse(prompt, machines, [], readings.slice(-50));

    const raw = extractJsonArray(llmText);
    if (!Array.isArray(raw)) throw new Error('LLM response is not a JSON array');

    const now = Date.now();
    const entries: OptimisationEntry[] = raw.slice(0, 15).map((item: any, i: number) => ({
      id: `opt-${now}-${i}`,
      title: String(item?.title ?? `Optimization #${i + 1}`),
      description: String(item?.description ?? ''),
      priority: normalizePriority(item?.priority),
      status: 'pending',
      potentialSavings: toNumber(item?.potentialSavings, 0),
      co2Reduction: toNumber(item?.co2Reduction, 0),
      implementationTime: String(item?.implementationTime ?? 'TBD'),
    }));

    // Save each entry under /optimisations/{id}
    await Promise.all(entries.map(e => dataService.upsertOptimisation(e)));

    return entries;
  },
};
