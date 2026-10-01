import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — DMRJ Scheduling" },
      { name: "description", content: "Sign in to your DMRJ Scheduling workspace." },
      { property: "og:title", content: "Sign in — DMRJ Scheduling" },
      {
        property: "og:description",
        content: "Sign in to your DMRJ Scheduling workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Confirm your email address, then sign in.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account — sign in instead.";
  if (m.includes("password")) return message;
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("signin");

  // Send anyone who already has a live session straight into the app, and react
  // to a session arriving (sign-in, token restore) without racing the redirect.
  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active && data.user) navigate({ to: "/dashboard", replace: true });
      })
      .catch(() => {
        /* Keep the sign-in form available on connection errors. */
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setBusy(true);
    // Clear anything cached from a previous account before the new session lands.
    queryClient.clear();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      if (!data.session) {
        toast.error("Sign-in didn't complete. Please try again.");
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Couldn't sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    queryClient.clear();
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } },
      });
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      if (data.session) {
        toast.success("Account created — you have 2 complimentary credits.");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      toast.success("Check your email to confirm your account, then sign in.");
      setTab("signin");
      setPassword("");
      setConfirmation("");
    } catch {
      toast.error("Couldn't create your account. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-12">
      <div className="surface w-full max-w-md p-7">
        <h1 className="font-display text-2xl font-semibold text-primary">DMRJ Scheduling</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage your diary, team and customers.
        </p>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form className="space-y-4" onSubmit={signIn}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="space-y-4" onSubmit={signUp}>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Email</Label>
                <Input
                  id="email2"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Password</Label>
                <Input
                  id="password2"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New accounts include 2 complimentary credits.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
