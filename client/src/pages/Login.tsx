import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginProps {
  onLogin: (username: string, role: string) => void;
}

const CREDENTIALS: Record<string, string> = {
  ad: "adbk",
  shainez: "WVFw*{~a<;A*}3>&4yR~caoa#hrbr|z=E?M4`z$7,bZC2r+r>dAt-GU]C_o3)kXQSEE`9>o|e[D8qgxPy^C~QW-vQSt#PT$%[=}O8N(EzuI5E(V%>OwT}.LLmV}mu^+&@SXz<|P?A2([1m{u`982^qSLtf!Q]}`8ev;VM^D/lYOHm/%/6=JXY0Z,kU<md&^JQ~!@Rt`CHxyU?(,43KaJ7G#w4wI?Uociv>Dy@<z]%y@]up.G_{~|VZoZurAj0eUS",
  pronBOT: "Ballon:)2008",
};

export default function Login({ onLogin }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "ad",
      password: "",
    },
  });

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    form.setValue("username", role as any);
    form.clearErrors();
  };

  const onSubmit = (data: LoginInput) => {
    if (CREDENTIALS[data.username] !== data.password) {
      toast({
        variant: "destructive",
        title: "Échec de l'authentification",
        description: "Mot de passe invalide. Veuillez réessayer.",
      });
      return;
    }

    onLogin(data.username, data.username);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-md bg-primary flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Système de modération du chat</h1>
          <p className="text-sm text-muted-foreground mt-2">Sélectionnez votre rôle et connectez-vous</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Sélectionner le rôle</label>
              <div className="space-y-2">
                {["ad", "shainez", "pronBOT"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    data-testid={`button-role-${role}`}
                    className={`w-full p-3 rounded-lg border-2 transition-all hover-elevate active-elevate-2 ${
                      selectedRole === role
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm capitalize">{role}</span>
                      {role === "pronBOT" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                          Administrateur
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Entrez votre mot de passe"
                        className="h-12 pr-12"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12"
              disabled={!selectedRole}
              data-testid="button-login"
            >
              Se connecter
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Les identifiants de démonstration sont préconfigurés</p>
        </div>
      </Card>
    </div>
  );
}
