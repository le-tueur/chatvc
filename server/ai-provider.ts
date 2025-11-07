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

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "mistral",
          messages: messages.map(m => ({
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
      
      return {
        content: data.message?.content || "",
        actions: this.extractActions(data.message?.content || ""),
      };
    } catch (error) {
      console.error("Error calling Ollama API:", error);
      return {
        content: "Désolé, je rencontre un problème technique.",
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
    const systemPrompt = `Tu es un modérateur de chat. Analyse ce message et détermine:
1. S'il mentionne des applications de messagerie privée (Instagram, Snapchat, WhatsApp, Telegram, Discord, etc.)
2. S'il contient des insultes ou du contenu inapproprié
3. S'il doit être modéré

Réponds UNIQUEMENT avec un objet JSON dans ce format exact:
{
  "containsPrivateMessaging": true/false,
  "containsInsults": true/false,
  "shouldModerate": true/false,
  "suggestedAction": "description de l'action recommandée"
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
    
    return actions;
  }
}

export class MockAIProvider implements IAIProvider {
  async chat(messages: AIMessage[], context?: any): Promise<AIResponse> {
    const lastMessage = messages[messages.length - 1];
    const isAdmin = context?.userRole === "pronBOT";

    if (isAdmin) {
      return {
        content: "Bien sûr ! Je m'en occupe tout de suite. 😊",
        actions: [],
      };
    }

    return {
      content: "Message reçu.",
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

    const containsPrivateMessaging = privateMessagingKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    const containsInsults = insultKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    return {
      containsPrivateMessaging,
      containsInsults,
      shouldModerate: containsPrivateMessaging || containsInsults,
      suggestedAction: containsPrivateMessaging 
        ? "Fermer le chat - mention de messagerie privée détectée"
        : containsInsults
        ? "Bloquer le message - insulte détectée"
        : undefined,
    };
  }
}
