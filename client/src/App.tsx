import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Chat from "@/pages/Chat";

const SESSION_STORAGE_KEY = "chat_session";

function App() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    // Load session from localStorage on mount
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        return JSON.parse(savedSession);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
    return null;
  });

  // Save session to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [user]);

  const handleLogin = (username: string, role: string) => {
    setUser({ username, role });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {user ? (
          <Chat username={user.username} role={user.role} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
