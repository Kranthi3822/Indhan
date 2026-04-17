import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const setupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type SetupForm = z.infer<typeof setupSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: needsSetup, isLoading: checkingSetup } = trpc.auth.needsSetup.useQuery();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const setupForm = useForm<SetupForm>({ resolver: zodResolver(setupSchema) });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (e) => setError(e.message),
  });

  const setupMutation = trpc.auth.setup.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: (e) => setError(e.message),
  });

  if (checkingSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-primary/20">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663403005351/5eGjBPBASNJYbjmGqsiMsX/indhan-logo-6ekMaVrYfXxqGE4arLFfFC.webp"
              alt="Indhan"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary tracking-tight">इंधन</h1>
            <p className="text-sm text-muted-foreground mt-1">Fuel Station Operations Platform</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {needsSetup ? "Create Admin Account" : "Sign in"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {needsSetup
                ? "No users found. Set up your admin account to get started."
                : "Enter your credentials to access the dashboard"}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {needsSetup ? (
            <form
              onSubmit={setupForm.handleSubmit((data) => {
                setError(null);
                setupMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  {...setupForm.register("name")}
                />
                {setupForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{setupForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup-email">Email</Label>
                <Input
                  id="setup-email"
                  type="email"
                  placeholder="admin@example.com"
                  {...setupForm.register("email")}
                />
                {setupForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{setupForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="setup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                    {...setupForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {setupForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{setupForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full font-semibold h-11"
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={loginForm.handleSubmit((data) => {
                setError(null);
                loginMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    className="pr-10"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full font-semibold h-11"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
