import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Chat from "@/pages/Chat";

function App() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

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
