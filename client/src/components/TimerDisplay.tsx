import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerDisplayProps {
  timerEndTime?: number;
}

export default function TimerDisplay({ timerEndTime }: TimerDisplayProps) {
  const [dismissed, setDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!timerEndTime) {
      setDismissed(false);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, timerEndTime - Date.now());
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [timerEndTime]);

  if (!timerEndTime || dismissed || timeRemaining === 0) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const isWarning = minutes < 5;

  return (
    <Card
      className={`fixed top-4 right-4 z-50 p-4 min-w-[200px] ${
        isWarning ? "animate-pulse-glow border-destructive" : ""
      }`}
      data-testid="timer-display"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 ${isWarning ? "text-destructive" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium text-foreground">Chat Closing</span>
          </div>
          <div className={`text-2xl font-mono font-bold ${isWarning ? "text-destructive" : "text-foreground"}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 -mt-1 -mr-1"
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-timer"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
