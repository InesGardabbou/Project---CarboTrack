import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Settings, Key } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { Machine, Anomaly } from '@/data/mockData';
import { llmService } from '@/services/llmService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Fallback analysis when no API key is configured
function generateFallbackAnalysis(machines: Machine[], anomalies: Anomaly[], query: string): string {
  if (!machines || machines.length === 0) {
    return "⚠️ **Impossible d'accéder aux données.**\n\nJe ne reçois actuellement aucune donnée de vos machines. Veuillez vérifier la connexion Firebase.";
  }

  const lower = query.toLowerCase();
  const totalConsumption = machines.reduce((sum, m) => sum + m.consumption, 0);
  const totalCarbon = machines.reduce((sum, m) => sum + m.co2Emissions, 0);
  const activeMachines = machines.filter(m => m.status === 'operational');
  const criticalMachines = machines.filter(m => m.status === 'critical');
  const maintenanceMachines = machines.filter(m => m.status === 'maintenance');
  const topConsumers = [...machines].sort((a, b) => b.consumption - a.consumption).slice(0, 3);
  const inefficientMachines = machines.filter(m => m.efficiency < 85);
  const activeAnomalies = anomalies.filter(a => !a.resolved);

  // Check for specific machine queries
  const machineMatch = machines.find(m => 
    lower.includes(m.name.toLowerCase()) || 
    lower.includes(m.id.toLowerCase())
  );

  if (machineMatch) {
    const machineAnomalies = activeAnomalies.filter(a => a.machineId === machineMatch.id);
    return `🔍 **Détails de ${machineMatch.name}**

📋 **Informations Générales:**
• ID: ${machineMatch.id}
• Département: ${machineMatch.department}
• Statut: ${machineMatch.status === 'operational' ? '✅ Opérationnel' : machineMatch.status === 'critical' ? '🔴 Critique' : '🟡 Maintenance'}

📊 **Métriques Actuelles:**
• Température: ${machineMatch.temperature.toFixed(1)}°C
• Consommation: ${machineMatch.consumption.toFixed(1)} kWh
• Efficacité: ${machineMatch.efficiency.toFixed(1)}%
• Émissions CO₂: ${machineMatch.co2Emissions.toFixed(1)} g/h
• Heures actives: ${machineMatch.activeHours.toFixed(0)}h

${machineAnomalies.length > 0 ? `⚠️ **Anomalies Actives (${machineAnomalies.length}):**
${machineAnomalies.map(a => `• [${a.type.toUpperCase()}] ${a.description}`).join('\n')}` : '✅ Aucune anomalie détectée.'}

${machineMatch.status === 'critical' ? '🚨 **Action requise:** Cette machine nécessite une intervention immédiate!' : ''}`;
  }

  // Consumption analysis
  if (lower.includes('consommation') || lower.includes('energy') || lower.includes('conso') || lower.includes('combien')) {
    return `⚡ **Analyse de la Consommation**

🔹 **Charge Totale:** ${totalConsumption.toFixed(1)} kWh
🔹 **Machines Actives:** ${activeMachines.length}/${machines.length}

🏆 **Top Consommateurs:**
${topConsumers.map((m, i) => `${i+1}. **${m.name}**: ${m.consumption.toFixed(1)} kWh (${((m.consumption/totalConsumption)*100).toFixed(1)}%)`).join('\n')}

💡 **Conseil:** Surveillez ${topConsumers[0]?.name} qui représente la plus grande part de consommation.`;
  }

  // Anomaly analysis
  if (lower.includes('anomalie') || lower.includes('probleme') || lower.includes('panne') || lower.includes('alerte')) {
    if (criticalMachines.length === 0 && maintenanceMachines.length === 0 && activeAnomalies.length === 0) {
      return `✅ **Système Nominal**\n\nToutes les ${machines.length} machines fonctionnent correctement. Aucune anomalie détectée.`;
    }

    return `⚠️ **Rapport d'Anomalies**

🔴 **Machines Critiques (${criticalMachines.length}):**
${criticalMachines.length > 0 ? criticalMachines.map(m => `• **${m.name}**: Temp ${m.temperature.toFixed(1)}°C, Eff ${m.efficiency.toFixed(0)}%`).join('\n') : 'Aucune'}

🟡 **En Maintenance (${maintenanceMachines.length}):**
${maintenanceMachines.length > 0 ? maintenanceMachines.map(m => `• **${m.name}**`).join('\n') : 'Aucune'}

📋 **Anomalies Actives (${activeAnomalies.length}):**
${activeAnomalies.length > 0 ? activeAnomalies.slice(0, 5).map(a => `• [${a.type}] ${a.machineName}: ${a.description}`).join('\n') : 'Aucune'}

🔧 **Recommandation:** ${criticalMachines.length > 0 ? 'Intervention urgente requise sur les machines critiques!' : 'Planifiez la maintenance préventive.'}`;
  }

  // Carbon/emissions analysis
  if (lower.includes('carbon') || lower.includes('co2') || lower.includes('emission') || lower.includes('envir')) {
    return `🌍 **Bilan Carbone**

📊 **Émissions Totales:** ${totalCarbon.toFixed(1)} gCO₂/h
🏭 **Plus Gros Émetteur:** ${topConsumers[0]?.name} (${topConsumers[0]?.co2Emissions.toFixed(1)} gCO₂/h)

🌱 **Pistes de Réduction:**
• Optimiser ${topConsumers[0]?.name} (-10% = -${(topConsumers[0]?.co2Emissions * 0.1).toFixed(1)} gCO₂/h)
• ${inefficientMachines.length} machines avec efficacité < 85%

📈 **Intensité Carbone:** ${(totalCarbon / (totalConsumption || 1)).toFixed(2)} gCO₂/kWh`;
  }

  // Optimization suggestions
  if (lower.includes('optimi') || lower.includes('econom') || lower.includes('reduc') || lower.includes('conseil')) {
    const potentialSavings = inefficientMachines.reduce((sum, m) => sum + (m.consumption * 0.15), 0) * 0.380;
    return `🚀 **Optimisations Recommandées**

💰 **Gains Potentiels:** ~${potentialSavings.toFixed(2)} DT/heure

📋 **Actions Prioritaires:**
${inefficientMachines.length > 0 ? `• **Maintenance préventive:** ${inefficientMachines.map(m => m.name).slice(0,3).join(', ')} (efficacité < 85%)` : ''}
• **Décalage horaire:** Déplacer 10% de la charge en heures creuses
• **Surveillance:** ${topConsumers[0]?.name} consomme ${((topConsumers[0]?.consumption/totalConsumption)*100).toFixed(0)}% du total

🎯 **Priorité #1:** ${inefficientMachines.length > 0 ? `Améliorer l'efficacité de ${inefficientMachines[0]?.name}` : `Optimiser les cycles de ${topConsumers[0]?.name}`}`;
  }

  // Default welcome/help
  return `👋 **Bienvenue sur CarboTrack AI**

Je suis connecté à **${machines.length} machines** en temps réel.

📊 **État Actuel:**
• ✅ Opérationnelles: ${activeMachines.length}
• 🔴 Critiques: ${criticalMachines.length}
• 🟡 Maintenance: ${maintenanceMachines.length}
• ⚠️ Anomalies actives: ${activeAnomalies.length}

💬 **Demandez-moi:**
• "Montre-moi la machine CNC-01"
• "Quelles sont les anomalies ?"
• "Comment optimiser ma consommation ?"
• "Bilan carbone"

🔑 **Astuce:** Configurez une clé API Google (Gemini) (⚙️) pour des analyses plus avancées!`;
}

export function ChatbotAssistant() {
  const { chatbotOpen, toggleChatbot } = useAppStore();
  const { machines, anomalies, readings } = useRealtimeData();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Bonjour ! Je suis **CarboTrack AI**, votre assistant intelligent connecté à vos machines en temps réel via Firebase.\n\n🟢 **Gemini est activé!** Posez-moi n'importe quelle question sur vos machines, anomalies, consommation ou optimisations.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('AIzaSyDs6bzPZtp8rHDAG9U1b9qhYFs5aODLo3U');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Preserve literal asterisks ("**") so they remain visible in the chat output.
  // Inserts zero-width spaces around pairs of asterisks to avoid them being
  // interpreted by any markdown renderer while keeping the stars visible.
  function preserveAsterisks(text: string) {
    if (!text) return text;
    return text.replace(/\*\*/g, '\u200B**\u200B');
  }

  // Load Google API key from localStorage on mount, or use default
  useEffect(() => {
    const savedKey = localStorage.getItem('carbotrack_google_key');
    const keyToUse = savedKey || 'AIzaSyDs6bzPZtp8rHDAG9U1b9qhYFs5aODLo3U';
    setApiKey(keyToUse);
    llmService.initialize(keyToUse);
    setApiKeyConfigured(true);
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('carbotrack_google_key', apiKey.trim());
      llmService.initialize(apiKey.trim());
      setApiKeyConfigured(true);
      setShowSettings(false);
      
      // Add confirmation message
      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "✅ **Clé API configurée!**\n\nClé Google enregistrée. L'assistant utilisera maintenant Gemini pour les réponses avancées.\n\nPosez-moi n'importe quelle question sur vos machines!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userQuery = input;
    setInput('');
    setIsTyping(true);

    try {
      let responseContent: string;

      if (llmService.isInitialized()) {
        // Use LLM for advanced analysis
        const chatHistory = messages.slice(-6).map(m => ({ 
          role: m.role as 'user' | 'assistant', 
          content: m.content 
        }));
        
        responseContent = await llmService.getResponse(
          userQuery,
          machines,
          anomalies,
          readings,
          chatHistory
        );
      } else {
        // Use fallback local analysis
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        responseContent = generateFallbackAnalysis(machines, anomalies, userQuery);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "❌ Une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={toggleChatbot}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 animate-pulse-glow',
          chatbotOpen && 'scale-0 opacity-0'
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-[550px] w-[400px] flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300',
          chatbotOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-primary/10 px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">CarboTrack AI</h3>
              <p className="text-xs text-muted-foreground">
                {apiKeyConfigured ? '🟢 Gemini Activé' : '🟡 Mode Local'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "rounded-lg p-1.5 hover:bg-muted transition-colors",
                showSettings && "bg-muted"
              )}
              title="Configurer API"
            >
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={toggleChatbot}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-b border-border bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Clé API Gemini (Google)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSaveApiKey}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Sauver
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Obtenez une clé sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aistudio.google.com</a>
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  message.role === 'assistant'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-accent text-accent-foreground'
                )}
              >
                {message.role === 'assistant' ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  message.role === 'assistant'
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <div className="whitespace-pre-wrap">{preserveAsterisks(message.content)}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-border px-4 py-2 flex gap-2 overflow-x-auto">
          {['Anomalies ?', 'Consommation', 'Optimiser', 'CO2'].map((quick) => (
            <button
              key={quick}
              onClick={() => setInput(quick)}
              className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/80 transition-colors"
            >
              {quick}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Posez une question sur vos machines..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
