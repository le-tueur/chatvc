import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import UserList from "@/components/UserList";
import TypingIndicator from "@/components/TypingIndicator";
import TimerDisplay from "@/components/TimerDisplay";
import PendingMessages from "@/components/PendingMessages";
import AdminControls from "@/components/AdminControls";
import BotCommandPanel from "@/components/BotCommandPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, MessageSquare, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatProps {
  username: string;
  role: string;
  onLogout: () => void;
}

export default function Chat({ username, role, onLogout }: ChatProps) {
  const [adminView, setAdminView] = useState<"panel" | "chat">("chat");
  const isAdmin = role === "pronBOT";

  const {
    isConnected,
    chatState,
    sendMessage,
    sendTyping,
    approveMessage,
    rejectMessage,
    sendEvent,
    sendFlash,
    updateConfig,
    muteUser,
    unmuteUser,
    hideUser,
    unhideUser,
    addBlockedWord,
    removeBlockedWord,
    clearHistory,
    forcePublish,
    resetTimers,
    triggerAnimation,
    exportHistory,
    deleteMessage,
    sendBotCommand,
    executeBotCommand,
    updateBotConfig,
  } = useWebSocket(username, role);

  const handleSendBotCommand = (command: string) => {
    sendBotCommand(command);
  };

  const handleExecuteBotCommand = (command: string) => {
    executeBotCommand(command);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <TimerDisplay timerEndTime={chatState.config.timerEndTime} />

      <header className="h-16 px-6 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            {isAdmin ? (
              <Shield className="w-5 h-5 text-primary-foreground" />
            ) : (
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Système de modération du chat</h1>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? "Connecté" : "Déconnecté"}
              </Badge>
              <span className="text-xs text-muted-foreground">Connecté en tant que <strong>{username}</strong></span>
              {isAdmin && <Badge variant="destructive" className="text-xs">Admin</Badge>}
              {chatState.config.simulationMode && (
                <Badge variant="secondary" className="text-xs">Mode simulation</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex gap-1 mr-2">
              <Button
                variant={adminView === "chat" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAdminView("chat")}
                data-testid="button-view-chat"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={adminView === "panel" ? "default" : "ghost"}
                size="sm"
                onClick={() => setAdminView("panel")}
                data-testid="button-view-panel"
              >
                <Settings className="w-4 h-4 mr-2" />
                Panneau Admin
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={onLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex flex-shrink-0">
          <UserList
            users={chatState.users}
            currentUsername={username}
            showHidden={isAdmin}
          />
        </div>

        {isAdmin && adminView === "panel" ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-bold text-foreground">Tableau de bord administrateur</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Contrôles complets de modération pour le système de chat
                </p>
              </div>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <PendingMessages
                      pendingMessages={chatState.pendingMessages}
                      onApprove={approveMessage}
                      onReject={rejectMessage}
                      onForcePublish={forcePublish}
                    />

                    <BotCommandPanel
                      botConfig={chatState.botConfig}
                      botPlan={chatState.botPlan}
                      botCommand={chatState.botCommand}
                      onSendCommand={handleSendBotCommand}
                      onExecuteCommand={handleExecuteBotCommand}
                      onUpdateConfig={updateBotConfig}
                    />

                    <AdminControls
                      config={chatState.config}
                      users={chatState.users}
                      mutedUsers={chatState.mutedUsers}
                      blockedWords={chatState.blockedWords}
                      currentUsername={username}
                      onUpdateConfig={updateConfig}
                      onSendEvent={sendEvent}
                      onSendFlash={sendFlash}
                      onMuteUser={muteUser}
                      onUnmuteUser={unmuteUser}
                      onHideUser={hideUser}
                      onUnhideUser={unhideUser}
                      onAddBlockedWord={addBlockedWord}
                      onRemoveBlockedWord={removeBlockedWord}
                      onClearHistory={clearHistory}
                      onResetTimers={resetTimers}
                      onTriggerAnimation={triggerAnimation}
                      onExportHistory={exportHistory}
                    />
                  </div>
                </ScrollArea>
              </div>
            </div>

            <Card className="hidden lg:flex w-80 flex-col border-l border-border rounded-none">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-sm">Aperçu du chat en direct</h3>
              </div>
              <MessageList
                messages={chatState.messages}
                currentUsername={username}
                currentRole={role}
                onDeleteMessage={deleteMessage}
              />
              <TypingIndicator typingUsers={chatState.typingUsers} currentUsername={username} />
              <MessageInput
                onSendMessage={sendMessage}
                onTyping={sendTyping}
                cooldown={chatState.config.cooldown}
                disabled={!chatState.config.enabled}
              />
            </Card>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <MessageList
              messages={chatState.messages}
              currentUsername={username}
              currentRole={role}
              onDeleteMessage={deleteMessage}
            />
            <TypingIndicator typingUsers={chatState.typingUsers} currentUsername={username} />
            <MessageInput
              onSendMessage={sendMessage}
              onTyping={sendTyping}
              cooldown={chatState.config.cooldown}
              disabled={!chatState.config.enabled}
            />
          </div>
        )}

        {isAdmin && adminView === "chat" && (
          <Card className="hidden xl:flex w-96 flex-col border-l border-border rounded-none">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Contrôles rapides d'administration</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <PendingMessages
                pendingMessages={chatState.pendingMessages}
                onApprove={approveMessage}
                onReject={rejectMessage}
                onForcePublish={forcePublish}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
