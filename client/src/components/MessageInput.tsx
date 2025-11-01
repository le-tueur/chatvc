import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  cooldown: number;
  disabled: boolean;
}

export default function MessageInput({
  onSendMessage,
  onTyping,
  cooldown,
  disabled,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [canSend, setCanSend] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanSend(true);
    }
  }, [timeRemaining]);

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.length > 0) {
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    } else {
      onTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    if (disabled) {
      toast({
        variant: "destructive",
        title: "Chat Disabled",
        description: "The chat has been temporarily disabled by the administrator.",
      });
      return;
    }

    if (!canSend) {
      toast({
        variant: "destructive",
        title: "Please wait",
        description: `You can send another message in ${timeRemaining} seconds.`,
      });
      return;
    }

    onSendMessage(message.trim());
    setMessage("");
    onTyping(false);

    if (cooldown > 0) {
      setCanSend(false);
      setTimeRemaining(cooldown);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-6 py-4 border-t border-border bg-background"
      data-testid="message-input-form"
    >
      <div className="flex items-end gap-3">
        <Textarea
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Chat is disabled..." : "Type your message..."}
          className="flex-1 resize-none rounded-lg px-4 py-3 min-h-[60px] max-h-24"
          disabled={disabled}
          data-testid="input-message"
        />
        <Button
          type="submit"
          size="icon"
          className="w-12 h-12 rounded-full flex-shrink-0"
          disabled={!message.trim() || disabled || !canSend}
          data-testid="button-send"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
      {timeRemaining > 0 && (
        <p className="text-xs text-muted-foreground mt-2" data-testid="text-cooldown">
          Wait {timeRemaining}s before sending another message
        </p>
      )}
      {message.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {message.length} / 1000 characters
        </p>
      )}
    </form>
  );
}
