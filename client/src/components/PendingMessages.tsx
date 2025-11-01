import type { Message } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, FastForward, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PendingMessagesProps {
  pendingMessages: Message[];
  onApprove: (messageId: string) => void;
  onReject: (messageId: string) => void;
  onForcePublish: (messageId: string) => void;
}

export default function PendingMessages({
  pendingMessages,
  onApprove,
  onReject,
  onForcePublish,
}: PendingMessagesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          En attente de validation ({pendingMessages.length})
        </h3>
      </div>

      {pendingMessages.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Aucun message en attente</p>
        </Card>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 pr-4">
            {pendingMessages.map((message) => (
              <Card
                key={message.id}
                className="p-3"
                data-testid={`pending-message-${message.id}`}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{message.username}</span>
                      <Badge variant="secondary" className="text-xs">
                        {message.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                      {message.content}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-10"
                      onClick={() => onApprove(message.id)}
                      data-testid={`button-approve-${message.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-10"
                      onClick={() => onReject(message.id)}
                      data-testid={`button-reject-${message.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Rejeter
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-10"
                      onClick={() => onForcePublish(message.id)}
                      data-testid={`button-force-${message.id}`}
                    >
                      <FastForward className="w-4 h-4 mr-1" />
                      Forcer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
