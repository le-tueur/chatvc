import type { User } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Volume2, VolumeX, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserListProps {
  users: User[];
  currentUsername: string;
  showHidden?: boolean;
}

export default function UserList({ users, currentUsername, showHidden = false }: UserListProps) {
  const visibleUsers = showHidden
    ? users
    : users.filter(user => !user.isHidden);

  const onlineUsers = visibleUsers.filter(u => u.isOnline);
  const offlineUsers = visibleUsers.filter(u => !u.isOnline);

  const getAvatarColor = (role: string) => {
    switch (role) {
      case "ad":
        return "bg-blue-500";
      case "shainez":
        return "bg-purple-500";
  case "pronBOT":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const UserCard = ({ user }: { user: User }) => {
    const isCurrentUser = user.username === currentUsername;
    const isMuted = user.isMuted && user.mutedUntil && user.mutedUntil > Date.now();
    const mutedTimeRemaining = isMuted && user.mutedUntil
      ? Math.ceil((user.mutedUntil - Date.now()) / 1000 / 60)
      : 0;

    return (
      <div
        key={user.id}
        className={`p-3 rounded-lg hover-elevate ${
          isCurrentUser ? "bg-primary/10 border border-primary/20" : "bg-card"
        }`}
        data-testid={`user-card-${user.username}`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={getAvatarColor(user.role)}>
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {user.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-status-online rounded-full border-2 border-card" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">
                {user.username}
              </span>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">
                  Vous
                </Badge>
              )}
              {user.role === "pronBOT" && (
                <Badge variant="destructive" className="text-xs">
                  Administrateur
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {isMuted && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <VolumeX className="w-3 h-3" />
                  <span>{mutedTimeRemaining}m</span>
                </div>
              )}
              {user.isHidden && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EyeOff className="w-3 h-3" />
                  <span>Caché</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-64 flex flex-col h-full p-4" data-testid="user-list">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          Utilisateurs connectés ({onlineUsers.length})
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {onlineUsers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                En ligne
              </h3>
              <div className="space-y-2">
                {onlineUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {offlineUsers.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Hors ligne
              </h3>
              <div className="space-y-2 opacity-60">
                {offlineUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {visibleUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Aucun utilisateur</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
