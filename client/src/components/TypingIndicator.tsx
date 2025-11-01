interface TypingIndicatorProps {
  typingUsers: string[];
  currentUsername: string;
}

export default function TypingIndicator({ typingUsers, currentUsername }: TypingIndicatorProps) {
  const otherTypingUsers = typingUsers.filter(user => user !== currentUsername);

  if (otherTypingUsers.length === 0) return null;

  return (
    <div className="px-6 py-2 text-sm text-muted-foreground" data-testid="typing-indicator">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <div
            className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
            style={{ animationDelay: "200ms" }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground rounded-full animate-typing-dot"
            style={{ animationDelay: "400ms" }}
          />
        </div>
        <span>
          {otherTypingUsers.length === 1
            ? `${otherTypingUsers[0]} est en train d'écrire...`
            : otherTypingUsers.length === 2
            ? `${otherTypingUsers[0]} et ${otherTypingUsers[1]} écrivent...`
            : `${otherTypingUsers.length} personnes écrivent...`}
        </span>
      </div>
    </div>
  );
}
