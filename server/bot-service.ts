import { IAIProvider, MockAIProvider, OllamaMistralProvider, AIMessage } from "./ai-provider";
import type { Message, User, BotConfig } from "@shared/schema";
import { GitHubStorage } from "./github-storage";
import { randomUUID } from "crypto";

export class BotService {
  private aiProvider: IAIProvider;
  private storage: GitHubStorage;
  private botUser: User;

  constructor(storage: GitHubStorage, useOllama: boolean = false) {
    this.storage = storage;
    
    if (useOllama && process.env.OLLAMA_BASE_URL) {
      this.aiProvider = new OllamaMistralProvider();
    } else {
      this.aiProvider = new MockAIProvider();
      if (useOllama) {
        console.warn("⚠️ OLLAMA_BASE_URL not configured, using mock AI provider");
      }
    }

    this.botUser = {
      id: "bot-pronbote",
      username: "pronbote",
      role: "pronbote",
      isOnline: true,
      isMuted: false,
      isHidden: false,
      isBot: true,
    };

    this.storage.addUser(this.botUser);
  }

  async processMessage(message: Message, senderRole: string): Promise<void> {
    const config = this.storage.getBotConfig();
    
    if (!config.enabled || !config.monitorChat) {
      return;
    }

    const analysis = await this.aiProvider.analyzeMessage(message.content, {
      senderRole,
      config,
    });

    if (config.detectPrivateMessaging && analysis.containsPrivateMessaging) {
      await this.handlePrivateMessagingDetection(message);
      return;
    }

    if (config.autoModeration && analysis.containsInsults) {
      await this.handleInsultDetection(message);
      return;
    }
  }

  async handleCommand(command: string, adminRole: string): Promise<{
    plan: string;
    confirmed: boolean;
  }> {
    const config = this.storage.getBotConfig();
    
    const systemPrompt = this.buildSystemPrompt(adminRole, config);
    
    const messages: AIMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: command,
      },
    ];

    const response = await this.aiProvider.chat(messages, {
      userRole: adminRole,
      config,
    });

    return {
      plan: response.content,
      confirmed: false,
    };
  }

  async executeCommand(command: string, adminRole: string, broadcast: Function): Promise<void> {
    const systemPrompt = this.buildSystemPrompt(adminRole, this.storage.getBotConfig());
    
    const messages: AIMessage[] = [
      {
        role: "system",
        content: `${systemPrompt}\n\nTu dois maintenant EXÉCUTER cette commande. Génère une réponse qui sera envoyée dans le chat.`,
      },
      {
        role: "user",
        content: command,
      },
    ];

    const response = await this.aiProvider.chat(messages, {
      userRole: adminRole,
    });

    const botMessage: Message = {
      id: randomUUID(),
      userId: this.botUser.id,
      username: this.botUser.username,
      role: this.botUser.role,
      content: response.content,
      timestamp: Date.now(),
      status: "approved",
      type: "normal",
    };

    this.storage.addMessage(botMessage);
    broadcast({ type: "message", message: botMessage });

    if (response.actions) {
      for (const action of response.actions) {
        await this.executeAction(action, broadcast);
      }
    }
  }

  async respondToUser(message: Message, broadcast: Function): Promise<void> {
    const config = this.storage.getBotConfig();
    
    if (!config.enabled || !config.respondToUsers) {
      return;
    }

    const systemPrompt = `Tu es pronbote, un modérateur de chat.
Avec les utilisateurs normaux (ad, shainez), tu es FROID, BREF et AUTORITAIRE.
Tu réponds UNIQUEMENT aux messages qui nécessitent une réponse.
Garde tes réponses à 1-2 phrases maximum.
Ne sois jamais amical ou bavard avec les utilisateurs normaux.`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message.content },
    ];

    const response = await this.aiProvider.chat(messages, {
      userRole: message.role,
      config,
    });

    if (response.content && response.content.trim().length > 0) {
      const botMessage: Message = {
        id: randomUUID(),
        userId: this.botUser.id,
        username: this.botUser.username,
        role: this.botUser.role,
        content: response.content,
        timestamp: Date.now(),
        status: "approved",
        type: "normal",
      };

      this.storage.addMessage(botMessage);
      broadcast({ type: "message", message: botMessage });
    }
  }

  async respondToAdmin(message: Message, broadcast: Function): Promise<void> {
    const config = this.storage.getBotConfig();
    
    if (!config.enabled || !config.respondToAdmins) {
      return;
    }

    const systemPrompt = `Tu es pronbote, un assistant IA pour l'administrateur.
Avec l'admin (pronBOT), tu es direct quand on te demande un truc tu donne une reponse sans ajouter de chose inutile .
Tu es enthousiaste et toujours prêt à aider.
Tu peux exécuter toutes les actions admin : modération, fermeture du chat, gestion du timer, etc.`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message.content },
    ];

    const response = await this.aiProvider.chat(messages, {
      userRole: message.role,
      config,
    });

    const botMessage: Message = {
      id: randomUUID(),
      userId: this.botUser.id,
      username: this.botUser.username,
      role: this.botUser.role,
      content: response.content,
      timestamp: Date.now(),
      status: "approved",
      type: "normal",
    };

    this.storage.addMessage(botMessage);
    broadcast({ type: "message", message: botMessage });
  }

  private async handlePrivateMessagingDetection(message: Message): Promise<void> {
    this.storage.updateConfig({ enabled: false });

    const warningMessage: Message = {
      id: randomUUID(),
      userId: this.botUser.id,
      username: "Système",
      role: "pronbote",
      content: `⚠️ Chat fermé automatiquement - Mention de messagerie privée détectée (${message.username})`,
      timestamp: Date.now(),
      status: "approved",
      type: "event",
    };

    this.storage.addMessage(warningMessage);
  }

  private async handleInsultDetection(message: Message): Promise<void> {
    const warningMessage: Message = {
      id: randomUUID(),
      userId: this.botUser.id,
      username: "Système",
      role: "pronbote",
      content: `⚠️ Message de ${message.username} bloqué pour contenu inapproprié`,
      timestamp: Date.now(),
      status: "approved",
      type: "event",
    };

    this.storage.addMessage(warningMessage);
  }

  private buildSystemPrompt(userRole: string, config: BotConfig): string {
    const isAdmin = userRole === "pronBOT";
    
    let prompt = `Tu es pronbote, un assistant IA pour le chat modéré.

PERSONNALITÉ:
`;

    if (isAdmin) {
      prompt += `- Avec les admins (pronBOT): Tu es JOYEUX, BAVARD et COLLABORATIF 😊
- Tu es enthousiaste et toujours prêt à aider
- Tu peux exécuter toutes les actions admin
`;
    } else {
      prompt += `- Avec les utilisateurs (ad, shainez): Tu es FROID, BREF et AUTORITAIRE
- Tu réponds en 1-2 phrases maximum
- Tu ne montres aucune émotion
`;
    }

    prompt += `
CAPACITÉS:
- Approuver/rejeter des messages en attente
- Ouvrir/fermer le chat
- Définir des timers de fermeture
- Envoyer des messages système (en rouge)
- Muter des utilisateurs
- Modérer automatiquement les messages

CONFIGURATION ACTUELLE:
- Modération auto: ${config.autoModeration ? "activée" : "désactivée"}
- Détection messagerie privée: ${config.detectPrivateMessaging ? "activée" : "désactivée"}
- Surveillance: ${config.monitorChat ? "activée" : "désactivée"}

Pour indiquer une action à exécuter, utilise ces marqueurs dans ta réponse:
[CLOSE_CHAT] - Fermer le chat
[APPROVE] - Approuver un message
[REJECT] - Rejeter un message
`;

    return prompt;
  }

  private async executeAction(action: any, broadcast: Function): Promise<void> {
    switch (action.type) {
      case "close_chat":
        this.storage.updateConfig({ enabled: false });
        broadcast({ 
          type: "config_update", 
          config: this.storage.getConfig() 
        });
        break;
      
      case "approve_message":
        if (action.params?.messageId) {
          broadcast({ 
            type: "message_approved", 
            messageId: action.params.messageId 
          });
        }
        break;
        
      case "reject_message":
        if (action.params?.messageId) {
          broadcast({ 
            type: "message_rejected", 
            messageId: action.params.messageId 
          });
        }
        break;
    }
  }

  getBotUser(): User {
    return this.botUser;
  }

  isEnabled(): boolean {
    return this.storage.getBotConfig().enabled;
  }
}
