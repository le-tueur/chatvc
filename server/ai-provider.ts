// server/services/ai-service.ts

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  actions?: BotAction[];
}

export interface BotAction {
  type: "approve_message" | "reject_message" | "close_chat" | "send_event" | "mute_user" | "open_timer";
  params?: any;
}

export interface IAIProvider {
  chat(messages: AIMessage[], context?: any): Promise<AIResponse>;
  analyzeMessage(message: string, context?: any): Promise<{
    containsPrivateMessaging: boolean;
    containsInsults: boolean;
    shouldModerate: boolean;
    suggestedAction?: string;
  }>;
}

export class OllamaMistralProvider implements IAIProvider {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl?: string, authToken?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.authToken = authToken || process.env.OLLAMA_AUTH_TOKEN;
  }

  async chat(messages: AIMessage[], context?: any): Promise<AIResponse> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }

      // Prompt système renforcé (style directif et concis)
      const SYSTEM_PROMPT = `
Tu es pronBOT, un bot d'administration automatique pour un chat en ligne.

Règles strictes :
- Tes réponses sont courtes, claires et directes.
- Ne donne jamais d'explication ou de politesse.
- Ne parle pas d'autres sujets que la gestion du chat.
- Si un message contient "ferme", exécute une action de fermeture du chat.
- Si on dit "ferme dans X secondes/minutes", programme un timer interne.
- Si tu reçois "[CLOSE_CHAT]", ferme immédiatement.
- N’écris jamais autre chose que l’information nécessaire ou le code d’action.
`;

      const finalMessages: AIMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ];

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "mistral",
          messages: finalMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const output = data.message?.content || "";

      // Ajout de la gestion des délais (fermeture programmée)
      const timerMatch = output.match(/ferme dans (\d+)\s*(sec|secondes|minutes|min)/i);
      if (timerMatch) {
        const delay = Number(timerMatch[1]);
        const isMinutes = timerMatch[2].startsWith("min");
        const ms = isMinutes ? delay * 60000 : delay * 1000;

        setTimeout(() => {
          console.log("Chat fermé automatiquement après délai.");
        }, ms);
      }

      return {
        content: output,
        actions: this.extractActions(output),
      };
    } catch (error) {
      console.error("Error calling Ollama API:", error);
      return {
        content: "Erreur système.",
        actions: [],
      };
    }
  }

  async analyzeMessage(message: string, context?: any): Promise<{
    containsPrivateMessaging: boolean;
    containsInsults: boolean;
    shouldModerate: boolean;
    suggestedAction?: string;
  }> {
    const systemPrompt = `Tu es un modérateur automatique.
Analyse ce message et réponds uniquement en JSON :
{
  "containsPrivateMessaging": true/false,
  "containsInsults": true/false,
  "shouldModerate": true/false,
  "suggestedAction": "courte description"
}`;

    try {
      const response = await this.chat([
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ], context);

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          containsPrivateMessaging: analysis.containsPrivateMessaging || false,
          containsInsults: analysis.containsInsults || false,
          shouldModerate: analysis.shouldModerate || false,
          suggestedAction: analysis.suggestedAction,
        };
      }

      return {
        containsPrivateMessaging: false,
        containsInsults: false,
        shouldModerate: false,
      };
    } catch (error) {
      console.error("Error analyzing message:", error);
      return {
        containsPrivateMessaging: false,
        containsInsults: false,
        shouldModerate: false,
      };
    }
  }

  private extractActions(content: string): BotAction[] {
    const actions: BotAction[] = [];

    if (content.includes("[CLOSE_CHAT]")) {
      actions.push({ type: "close_chat" });
    }
    if (content.includes("[APPROVE]")) {
      actions.push({ type: "approve_message" });
    }
    if (content.includes("[REJECT]")) {
      actions.push({ type: "reject_message" });
    }

    // Timer automatique détecté dans la réponse
    const match = content.match(/ferme dans (\d+)\s*(sec|secondes|minutes|min)/i);
    if (match) {
      const delay = Number(match[1]);
      const isMinutes = match[2].startsWith("min");
      actions.push({
        type: "open_timer",
        params: { delay: delay, unit: isMinutes ? "minutes" : "secondes" },
      });
    }

    return actions;
  }
}

export class MockAIProvider implements IAIProvider {
  async chat(messages: AIMessage[], context?: any): Promise<AIResponse> {
    const lastMessage = messages[messages.length - 1];
    const message = lastMessage.content.toLowerCase();

    // Simulation réaliste pour tests sans Ollama
    if (/ferme dans (\d+)/i.test(message)) {
      return {
        content: "Fermeture programmée.",
        actions: [{ type: "open_timer", params: { delay: 60, unit: "secondes" } }],
      };
    }

    if (message.includes("ferme")) {
      return {
        content: "[CLOSE_CHAT]",
        actions: [{ type: "close_chat" }],
      };
    }

    return {
      content: "OK.",
      actions: [],
    };
  }

  async analyzeMessage(message: string): Promise<{
    containsPrivateMessaging: boolean;
    containsInsults: boolean;
    shouldModerate: boolean;
    suggestedAction?: string;
  }> {
    const lowerMessage = message.toLowerCase();
    const privateMessagingKeywords = [
      "insta", "instagram", "snap", "snapchat", "whatsapp", "telegram",
      "discord", "messenger", "dm", "privé", "pv", "mp"
    ];
    const insultKeywords = ["connard", "con", "merde", "putain"];

    const containsPrivateMessaging = privateMessagingKeywords.some(k => lowerMessage.includes(k));
    const containsInsults = insultKeywords.some(k => lowerMessage.includes(k));

    return {
      containsPrivateMessaging,
      containsInsults,
      shouldModerate: containsPrivateMessaging || containsInsults,
      suggestedAction: containsPrivateMessaging
        ? "Fermer le chat - mention privée"
        : containsInsults
        ? "Bloquer le message - insulte détectée"
        : undefined,
    };
  }
}
