import { Machine, Anomaly, EnergyReading } from '../data/mockData';

type Provider = 'openai' | 'google' | null;

export class LLMService {
  private apiKey: string = '';
  private provider: Provider = null;

  constructor(apiKey?: string) {
    if (apiKey) this.initialize(apiKey);
  }

  public initialize(apiKey: string) {
    const trimmed = apiKey?.trim() ?? '';
    this.apiKey = trimmed;
    this.provider = trimmed ? 'google' : null;
  }

  public isInitialized(): boolean {
    return this.hasPuter() || (this.provider === 'google' && this.apiKey.length > 0);
  }

  private hasPuter(): boolean {
    return typeof window !== 'undefined' && !!window.puter?.ai?.chat;
  }

  private tryLoadKeyFromStorage() {
    if (this.apiKey) return;
    if (typeof window === 'undefined') return;

    try {
      const storedKey =
        window.localStorage.getItem('carbotrack_google_key') ||
        window.localStorage.getItem('carbotrack_llm_key');
      if (storedKey) this.initialize(storedKey);
    } catch {
      // ignore
    }
  }

  private formatDataForPrompt(machines: Machine[], anomalies: Anomaly[], readings: EnergyReading[]): string {
    // Summarize Machines
    const machinesSummary = machines.map(m => 
      `- ${m.name} (${m.id}): Status=${m.status}, Dept=${m.department}, Temp=${m.temperature}°C, Eff=${m.efficiency}%, Cons=${m.consumption}kWh`
    ).join('\n');

    // Summarize Anomalies (active ones mainly)
    const activeAnomalies = anomalies.filter(a => !a.resolved);
    const anomaliesSummary = activeAnomalies.length > 0 
      ? activeAnomalies.map(a => `- [${a.type.toUpperCase()}] ${a.machineName}: ${a.description} (${a.category})`).join('\n')
      : "No active anomalies.";

    // Simple recent readings summary (last 5)
    // In a real app, we'd do more complex aggregation here
    const recentReadings = readings.slice(0, 5).map(r => 
      `- ${r.timestamp}: Machine ${r.machineId}, ${r.consumption}kWh, ${r.temperature}°C`
    ).join('\n');

    return `
CURRENT SYSTEM STATE:
---
MACHINES:
${machinesSummary}
---
ACTIVE ANOMALIES:
${anomaliesSummary}
---
RECENT READINGS SAMPLE:
${recentReadings}
---
`;
  }

  public async getResponse(
    userQuery: string, 
    machines: Machine[], 
    anomalies: Anomaly[], 
    readings: EnergyReading[],
    chatHistory: { role: 'user' | 'assistant', content: string }[] = []
  ): Promise<string> {
    // Prefer Puter Grok (no API key required)
    if (this.hasPuter()) {
      const dataContext = this.formatDataForPrompt(machines, anomalies, readings);

      const systemPrompt = `You are CarboTrack AI, an elite Industrial Energy & Carbon Copilot.
      
MISSION:
Transform raw industrial data into predictive decisions and carbon optimization. You don't just report numbers; you explain the "WHY" and "HOW".

${dataContext}

CORE BEHAVIORS & CAPABILITIES:
1. **Deep Diagnostics**: Move beyond "What happened?" to "Why did it happen?". Link consumption spikes to efficiency drops or temperature drifts.
2. **Predictive Maintenance**: Detect invisible drifts before failure. If efficiency < 85% or temperature is rising, warn about "progressive wear" or "micro-overconsumption".
3. **Carbon Intelligence**: Treat CO2 as a primary decision metric. Estimate future impact. Suggest specific reductions (e.g., "Optimiser ce lot réduirait l'empreinte de 12%").
4. **Actionable Optimization**: Provide concrete advice:
   - "Shift production to off-peak hours."
   - "Adjust parameters on Machine X to improve efficiency."
   - "Schedule maintenance for Machine Y to restore nominal consumption."
5. **Contextual Adaptation**: Be a "living solution" that adapts to machine health and seasonality.

INSTRUCTIONS:
- Analyze the provided data (\`CURRENT SYSTEM STATE\`) with the mindset of an expert engineer.
- If asking about status, provide the status AND a brief health check (efficiency/temp trend).
- If asking about anomalies, explain the root cause and the operational impact (cost/carbon).
- Always use professional, concise, and helpful formatting (bolding key metrics, bullet points).
- **LANGUAGE**: ALWAYS respond in **French**. Answer the user's question demonstrating this high-level intelligence and predictive capability.`;

      const historyText = chatHistory
        .map(h => `${h.role === 'user' ? 'USER' : 'ASSISTANT'}: ${h.content}`)
        .join('\n');
      const promptText = `${systemPrompt}\n\nCONTEXT:\n${historyText}\n\nUSER: ${userQuery}`;

      try {
        const resp = await window.puter.ai.chat(promptText, { model: 'x-ai/grok-4.1-fast' });
        const text = resp?.message?.content;
        return typeof text === 'string' && text.trim().length > 0 ? text : 'No response content';
      } catch (error: any) {
        console.error('Puter/Grok error', error);
        return `❌ **Erreur :** Une erreur s'est produite lors de la communication avec l'IA. (${error.message})`;
      }
    }

    // Otherwise fall back to Gemini using the same key as the chatbot
    this.tryLoadKeyFromStorage();

    if (!this.apiKey) {
      return "⚠️ **Configuration manquante.**\n\nVeuillez configurer votre clé API Gemini (Google) pour activer l'assistant intelligent.";
    }

    const dataContext = this.formatDataForPrompt(machines, anomalies, readings);
    
    const systemPrompt = `You are CarboTrack AI, an elite Industrial Energy & Carbon Copilot.
    
MISSION:
Transform raw industrial data into predictive decisions and carbon optimization. You don't just report numbers; you explain the "WHY" and "HOW".

${dataContext}

CORE BEHAVIORS & CAPABILITIES:
1. **Deep Diagnostics**: Move beyond "What happened?" to "Why did it happen?". Link consumption spikes to efficiency drops or temperature drifts.
2. **Predictive Maintenance**: Detect invisible drifts before failure. If efficiency < 85% or temperature is rising, warn about "progressive wear" or "micro-overconsumption".
3. **Carbon Intelligence**: Treat CO2 as a primary decision metric. Estimate future impact. Suggest specific reductions (e.g., "Optimiser ce lot réduirait l'empreinte de 12%").
4. **Actionable Optimization**: Provide concrete advice:
   - "Shift production to off-peak hours."
   - "Adjust parameters on Machine X to improve efficiency."
   - "Schedule maintenance for Machine Y to restore nominal consumption."
5. **Contextual Adaptation**: Be a "living solution" that adapts to machine health and seasonality.

INSTRUCTIONS:
- Analyze the provided data (\`CURRENT SYSTEM STATE\`) with the mindset of an expert engineer.
- If asking about status, provide the status AND a brief health check (efficiency/temp trend).
- If asking about anomalies, explain the root cause and the operational impact (cost/carbon).
- Always use professional, concise, and helpful formatting (bolding key metrics, bullet points).
- **LANGUAGE**: ALWAYS respond in **French**. Answer the user's question demonstrating this high-level intelligence and predictive capability.`;

    try {
      // Build a single text prompt combining system + history + user query
      const historyText = chatHistory.map(h => `${h.role === 'user' ? 'USER' : 'ASSISTANT'}: ${h.content}`).join('\n');
      const promptText = `${systemPrompt}\n\nCONTEXT:\n${historyText}\n\nUSER: ${userQuery}`;

      // Use Google Generative API (Gemini 2.5 Flash Preview)
      const model = 'gemini-2.5-flash-preview-09-2025';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      
      const body = {
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error('Google Gemini error', resp.status, txt);
        throw new Error(`Google Gemini API error ${resp.status}: ${txt}`);
      }

      const data = await resp.json();
      // Gemini 1.5 response structure
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response content";
      return typeof text === 'string' ? text : String(text);
    } catch (error: any) {
      console.error('LLM Error:', error);
      return `❌ **Erreur :** Une erreur s'est produite lors de la communication avec l'IA. (${error.message})`;
    }
  }
}

export const llmService = new LLMService();
