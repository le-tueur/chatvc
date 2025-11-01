import { useEffect, useRef, useState } from "react";
import type { Message } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, Megaphone } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  currentUsername: string;
  currentRole: string;
}

export default function MessageList({ messages, currentUsername, currentRole }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isNearBottom);
    }
  };

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

  const visibleMessages = messages.filter(msg => {
    if (msg.type === "event" || msg.type === "flash") return true;
    if (msg.status === "approved" || msg.forcePublished) return true;
  if (currentRole === "pronBOT") return true;
    if (msg.username === currentUsername) return true;
    return false;
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-6 space-y-4"
      data-testid="message-list"
    >
      {visibleMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucun message pour l'instant</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Soyez le premier à démarrer la conversation ! Envoyez un message ci-dessous.
          </p>
        </div>
      ) : (
        visibleMessages.map((message, index) => {
          if (message.type === "event") {
            return (
              <div
                key={message.id}
                className="py-3 px-6 bg-destructive/10 border-l-4 border-destructive rounded-lg animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`message-event-${message.id}`}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-sm text-destructive tracking-wide">
                    {message.content}
                  </span>
                </div>
              </div>
            );
          }

          if (message.type === "flash") {
            return (
              <div
                key={message.id}
                className="py-3 px-6 bg-primary/10 border-l-4 border-primary rounded-lg animate-bounce-subtle"
                data-testid={`message-flash-${message.id}`}
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm text-primary tracking-wide">
                    {message.content}
                  </span>
                </div>
              </div>
            );
          }

          const isPending = message.status === "pending" && !message.forcePublished;
          const isOwnMessage = message.username === currentUsername;

          return (
            <div
              key={message.id}
              className={`flex gap-3 animate-slide-up ${isPending ? "opacity-60" : ""}`}
              style={{ animationDelay: `${index * 50}ms` }}
              data-testid={`message-${message.id}`}
            >
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback className={getAvatarColor(message.role)}>
                  {message.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {message.username}
                  </span>
                  {message.role === "pronBOT" && (
                    <Badge variant="destructive" className="text-xs">
                      Administrateur
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground opacity-70 font-mono">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {isPending && (
                    <Badge
                      variant="secondary"
                      className="text-xs animate-pulse-glow"
                      data-testid={`badge-pending-${message.id}`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      En attente de validation
                    </Badge>
                  )}
                  {message.forcePublished && (
                    <Badge variant="outline" className="text-xs">
                      Publication forcée
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-base leading-relaxed break-words text-foreground">
                  {message.content}
                </p>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
