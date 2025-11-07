import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bot, Send, CheckCircle, Settings as SettingsIcon } from "lucide-react";
import type { BotConfig } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BotCommandPanelProps {
  botConfig?: BotConfig;
  botPlan?: string;
  botCommand?: string;
  onSendCommand: (command: string) => void;
  onExecuteCommand: (command: string) => void;
  onUpdateConfig: (config: Partial<BotConfig>) => void;
}

export default function BotCommandPanel({
  botConfig,
  botPlan,
  botCommand,
  onSendCommand,
  onExecuteCommand,
  onUpdateConfig,
}: BotCommandPanelProps) {
  const [command, setCommand] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  if (!botConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Panel IA pronbote
          </CardTitle>
          <CardDescription>Configuration du bot en cours de chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSendCommand = () => {
    if (!command.trim()) return;
    onSendCommand(command);
  };

  const handleExecuteCommand = () => {
    if (!botCommand) return;
    onExecuteCommand(botCommand);
    setCommand("");
  };

  const handleConfigChange = (key: keyof BotConfig, value: any) => {
    onUpdateConfig({ [key]: value });
  };

  return (
    <Card data-testid="card-bot-command-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <CardTitle>Panel IA pronbote</CardTitle>
            <Badge variant={botConfig.enabled ? "default" : "secondary"}>
              {botConfig.enabled ? "Activé" : "Désactivé"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-toggle-settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription>
          Commandez l'IA pour exécuter des actions automatiques dans le chat
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {showSettings && (
          <>
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold text-sm">Configuration du Bot</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="bot-enabled" className="text-sm">Bot activé</Label>
                <Switch
                  id="bot-enabled"
                  checked={botConfig.enabled}
                  onCheckedChange={(checked) => handleConfigChange("enabled", checked)}
                  data-testid="switch-bot-enabled"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-moderation" className="text-sm">Modération automatique</Label>
                <Switch
                  id="auto-moderation"
                  checked={botConfig.autoModeration}
                  onCheckedChange={(checked) => handleConfigChange("autoModeration", checked)}
                  data-testid="switch-auto-moderation"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="detect-private" className="text-sm">Détecter messagerie privée</Label>
                <Switch
                  id="detect-private"
                  checked={botConfig.detectPrivateMessaging}
                  onCheckedChange={(checked) => handleConfigChange("detectPrivateMessaging", checked)}
                  data-testid="switch-detect-private"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="respond-users" className="text-sm">Répondre aux utilisateurs</Label>
                <Switch
                  id="respond-users"
                  checked={botConfig.respondToUsers}
                  onCheckedChange={(checked) => handleConfigChange("respondToUsers", checked)}
                  data-testid="switch-respond-users"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="respond-admins" className="text-sm">Répondre aux admins</Label>
                <Switch
                  id="respond-admins"
                  checked={botConfig.respondToAdmins}
                  onCheckedChange={(checked) => handleConfigChange("respondToAdmins", checked)}
                  data-testid="switch-respond-admins"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="monitor-chat" className="text-sm">Surveiller le chat</Label>
                <Switch
                  id="monitor-chat"
                  checked={botConfig.monitorChat}
                  onCheckedChange={(checked) => handleConfigChange("monitorChat", checked)}
                  data-testid="switch-monitor-chat"
                />
              </div>
            </div>
            <Separator />
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="bot-command">Commande pour l'IA</Label>
          <Textarea
            id="bot-command"
            placeholder="Exemple: Envoie un message dans le chat pour dire que le chat ferme dans 30 minutes..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-bot-command"
          />
          <Button
            onClick={handleSendCommand}
            disabled={!command.trim() || !botConfig.enabled}
            className="w-full"
            data-testid="button-send-command"
          >
            <Send className="w-4 h-4 mr-2" />
            Demander un plan d'action
          </Button>
        </div>

        {botPlan && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Plan proposé par l'IA</Label>
                <Badge variant="outline" className="text-xs">
                  Prêt à exécuter
                </Badge>
              </div>
              <ScrollArea className="h-[150px] w-full rounded-md border p-4">
                <p className="text-sm whitespace-pre-wrap" data-testid="text-bot-plan">
                  {botPlan}
                </p>
              </ScrollArea>
              <div className="flex gap-2">
                <Button
                  onClick={handleExecuteCommand}
                  variant="default"
                  className="flex-1"
                  data-testid="button-execute-command"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmer et exécuter
                </Button>
                <Button
                  onClick={() => setCommand("")}
                  variant="outline"
                  data-testid="button-cancel-command"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground space-y-1 mt-4">
          <p className="font-semibold">Exemples de commandes :</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Envoie un message pour dire bonjour aux utilisateurs</li>
            <li>Ferme le chat dans 10 minutes et préviens toutes les 2 minutes</li>
            <li>Envoie un message d'avertissement à ad</li>
            <li>Active le mode direct et envoie un événement</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
