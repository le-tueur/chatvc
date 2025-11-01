import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Megaphone,
  Zap,
  UserX,
  Ban,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
  TestTube2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ChatConfig, User, MutedUser, BlockedWord } from "@shared/schema";

interface AdminControlsProps {
  config: ChatConfig;
  users: User[];
  mutedUsers: MutedUser[];
  blockedWords: BlockedWord[];
  currentUsername: string;
  onUpdateConfig: (config: Partial<ChatConfig>) => void;
  onSendEvent: (content: string) => void;
  onSendFlash: (content: string, duration: number) => void;
  onMuteUser: (username: string, duration: number) => void;
  onUnmuteUser: (username: string) => void;
  onHideUser: (username: string) => void;
  onUnhideUser: (username: string) => void;
  onAddBlockedWord: (word: string) => void;
  onRemoveBlockedWord: (word: string) => void;
  onClearHistory: () => void;
  onResetTimers: () => void;
  onTriggerAnimation: (type: string) => void;
  onExportHistory: (format: "text" | "json") => void;
}

export default function AdminControls({
  config,
  users,
  mutedUsers,
  blockedWords,
  currentUsername,
  onUpdateConfig,
  onSendEvent,
  onSendFlash,
  onMuteUser,
  onUnmuteUser,
  onHideUser,
  onUnhideUser,
  onAddBlockedWord,
  onRemoveBlockedWord,
  onClearHistory,
  onResetTimers,
  onTriggerAnimation,
  onExportHistory,
}: AdminControlsProps) {
  const [cooldownValue, setCooldownValue] = useState(config.cooldown.toString());
  const [timerValue, setTimerValue] = useState("0");
  const [eventMessage, setEventMessage] = useState("");
  const [flashMessage, setFlashMessage] = useState("");
  const [flashDuration, setFlashDuration] = useState("5");
  const [muteUsername, setMuteUsername] = useState("");
  const [muteDuration, setMuteDuration] = useState("5");
  const [newBlockedWord, setNewBlockedWord] = useState("");
  const { toast } = useToast();

  const handleCooldownUpdate = () => {
    const value = parseInt(cooldownValue);
    if (isNaN(value) || value < 0) {
      toast({ variant: "destructive", title: "Invalid cooldown value" });
      return;
    }
    onUpdateConfig({ cooldown: value });
    toast({ title: "Cooldown updated", description: `Set to ${value} seconds` });
  };

  const handleTimerUpdate = () => {
    const value = parseInt(timerValue);
    if (isNaN(value) || value < 0) {
      toast({ variant: "destructive", title: "Invalid timer value" });
      return;
    }
    onUpdateConfig({ timerMinutes: value });
    toast({ title: "Timer set", description: `Chat will close in ${value} minutes` });
    setTimerValue("0");
  };

  const handleSendEvent = () => {
    if (!eventMessage.trim()) return;
    onSendEvent(eventMessage.trim());
    setEventMessage("");
    toast({ title: "Event sent", description: "All users will see this notification" });
  };

  const handleSendFlash = () => {
    if (!flashMessage.trim()) return;
    const duration = parseInt(flashDuration);
    if (isNaN(duration) || duration < 1) {
      toast({ variant: "destructive", title: "Invalid duration" });
      return;
    }
    onSendFlash(flashMessage.trim(), duration);
    setFlashMessage("");
    toast({ title: "Flash message sent", description: `Will disappear in ${duration}s` });
  };

  const handleMuteUser = () => {
    if (!muteUsername.trim()) return;
    const duration = parseInt(muteDuration);
    if (isNaN(duration) || duration < 1) {
      toast({ variant: "destructive", title: "Invalid duration" });
      return;
    }
    onMuteUser(muteUsername.trim(), duration);
    setMuteUsername("");
    toast({ title: "User muted", description: `${muteUsername} for ${duration} minutes` });
  };

  const handleAddBlockedWord = () => {
    if (!newBlockedWord.trim()) return;
    onAddBlockedWord(newBlockedWord.trim().toLowerCase());
    setNewBlockedWord("");
    toast({ title: "Word blocked", description: "Messages with this word will be filtered" });
  };

  const otherUsers = users.filter(u => u.username !== currentUsername);
  const hiddenUsers = users.filter(u => u.isHidden);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Chat Controls</h3>
          </div>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="chat-enabled" className="font-medium">Enable Chat</Label>
                <p className="text-xs text-muted-foreground">Allow users to send messages</p>
              </div>
              <Switch
                id="chat-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => onUpdateConfig({ enabled: checked })}
                data-testid="switch-chat-enabled"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simulation-mode" className="font-medium">Simulation Mode</Label>
                <p className="text-xs text-muted-foreground">Test without affecting real users</p>
              </div>
              <Switch
                id="simulation-mode"
                checked={config.simulationMode}
                onCheckedChange={(checked) => onUpdateConfig({ simulationMode: checked })}
                data-testid="switch-simulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">Message Cooldown (seconds)</Label>
              <div className="flex gap-2">
                <Input
                  id="cooldown"
                  type="number"
                  min="0"
                  value={cooldownValue}
                  onChange={(e) => setCooldownValue(e.target.value)}
                  className="h-10"
                  data-testid="input-cooldown"
                />
                <Button onClick={handleCooldownUpdate} className="h-10" data-testid="button-set-cooldown">
                  Set
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timer">Chat Closure Timer (minutes)</Label>
              <div className="flex gap-2">
                <Input
                  id="timer"
                  type="number"
                  min="0"
                  value={timerValue}
                  onChange={(e) => setTimerValue(e.target.value)}
                  className="h-10"
                  data-testid="input-timer"
                />
                <Button onClick={handleTimerUpdate} className="h-10" data-testid="button-set-timer">
                  Set
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Announcements</h3>
          </div>

          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-message">Event Message (Red Banner)</Label>
              <Textarea
                id="event-message"
                value={eventMessage}
                onChange={(e) => setEventMessage(e.target.value)}
                placeholder="Important announcement..."
                className="resize-none h-20"
                maxLength={500}
                data-testid="input-event"
              />
              <Button
                onClick={handleSendEvent}
                className="w-full h-10"
                disabled={!eventMessage.trim()}
                data-testid="button-send-event"
              >
                Send Event
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="flash-message">Flash Message (Auto-disappear)</Label>
              <Textarea
                id="flash-message"
                value={flashMessage}
                onChange={(e) => setFlashMessage(e.target.value)}
                placeholder="Temporary message..."
                className="resize-none h-20"
                maxLength={500}
                data-testid="input-flash"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={flashDuration}
                  onChange={(e) => setFlashDuration(e.target.value)}
                  className="h-10 w-24"
                  placeholder="Sec"
                  data-testid="input-flash-duration"
                />
                <Button
                  onClick={handleSendFlash}
                  className="flex-1 h-10"
                  disabled={!flashMessage.trim()}
                  data-testid="button-send-flash"
                >
                  Send Flash
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">User Management</h3>
          </div>

          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Mute User</Label>
              <div className="flex gap-2">
                <Input
                  value={muteUsername}
                  onChange={(e) => setMuteUsername(e.target.value)}
                  placeholder="Username"
                  className="h-10"
                  list="users-list"
                  data-testid="input-mute-username"
                />
                <datalist id="users-list">
                  {otherUsers.map(u => <option key={u.id} value={u.username} />)}
                </datalist>
                <Input
                  type="number"
                  min="1"
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  placeholder="Min"
                  className="h-10 w-20"
                  data-testid="input-mute-duration"
                />
                <Button onClick={handleMuteUser} className="h-10" data-testid="button-mute">
                  Mute
                </Button>
              </div>
            </div>

            {mutedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Active Mutes</Label>
                <div className="flex flex-wrap gap-2">
                  {mutedUsers.map((mu) => {
                    const timeLeft = Math.ceil((mu.mutedUntil - Date.now()) / 60000);
                    return (
                      <Badge
                        key={mu.username}
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => onUnmuteUser(mu.username)}
                        data-testid={`badge-muted-${mu.username}`}
                      >
                        {mu.username} ({timeLeft}m) ×
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Hide/Unhide Users</Label>
              <div className="flex flex-wrap gap-2">
                {otherUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant={user.isHidden ? "secondary" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      user.isHidden ? onUnhideUser(user.username) : onHideUser(user.username)
                    }
                    data-testid={`badge-hide-${user.username}`}
                  >
                    {user.isHidden ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {user.username}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Blocked Words</h3>
          </div>

          <Card className="p-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={newBlockedWord}
                onChange={(e) => setNewBlockedWord(e.target.value)}
                placeholder="Word or phrase..."
                className="h-10"
                data-testid="input-blocked-word"
              />
              <Button
                onClick={handleAddBlockedWord}
                className="h-10"
                disabled={!newBlockedWord.trim()}
                data-testid="button-add-blocked"
              >
                Add
              </Button>
            </div>

            {blockedWords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {blockedWords.map((bw) => (
                  <Badge
                    key={bw.word}
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => onRemoveBlockedWord(bw.word)}
                    data-testid={`badge-blocked-${bw.word}`}
                  >
                    {bw.word} ×
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Actions</h3>
          </div>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="destructive"
                className="h-10"
                onClick={onClearHistory}
                data-testid="button-clear-history"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear History
              </Button>

              <Button
                variant="secondary"
                className="h-10"
                onClick={onResetTimers}
                data-testid="button-reset-timers"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Timers
              </Button>

              <Button
                variant="secondary"
                className="h-10"
                onClick={() => onTriggerAnimation("flash")}
                data-testid="button-flash-animation"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Flash All
              </Button>

              <Button
                variant="secondary"
                className="h-10"
                onClick={() => onTriggerAnimation("warning")}
                data-testid="button-warning-animation"
              >
                <TestTube2 className="w-4 h-4 mr-2" />
                Warning
              </Button>

              <Button
                variant="outline"
                className="h-10"
                onClick={() => onExportHistory("text")}
                data-testid="button-export-text"
              >
                <Download className="w-4 h-4 mr-2" />
                Export TXT
              </Button>

              <Button
                variant="outline"
                className="h-10"
                onClick={() => onExportHistory("json")}
                data-testid="button-export-json"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
