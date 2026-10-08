import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";

const AUTH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      window.setTimeout(() => reject(new Error("timeout")), AUTH_TIMEOUT_MS),
    ),
  ]);
}

async function ensureWorkspace(user: { id: string; user_metadata: Record<string, unknown> }) {
  const { data: existing, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (existing) return;

  const name = typeof user.user_metadata["pending_business_name"] === "string"
    ? user.user_metadata["pending_business_name"].trim()
    : "";
  const slug = typeof user.user_metadata["pending_business_slug"] === "string"
    ? slugify(user.user_metadata["pending_business_slug"])
    : "";
  if (!name || !slug) return;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({ owner_id: user.id, name, slug, onboarding_completed: true })
    .select("id")
    .single();
  if (businessError) throw businessError;

  const { error: memberError } = await supabase.from("business_members").insert({
    business_id: business.id,
    user_id: user.id,
    role: "owner",
  });
  if (memberError) throw memberError;
}

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
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Confirm your email address, then sign in.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "This email is already registered. Try signing in or reset your password.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess"))
    return "This password is too common or has appeared in data leaks. Use at least 12 characters, mixing words, numbers and symbols.";
  if (m.includes("should be at least") || m.includes("at least 12"))
    return "Password must be at least 12 characters.";
  if (m.includes("duplicate") && m.includes("slug")) return "That business URL is already in use.";
  if (m === "timeout") return "The request took too long. Please try again.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Wait a few minutes and try again.";
  if (m.includes("network") || m.includes("fetch")) return "Something went wrong. Please try again.";
  return message || "Something went wrong. Please try again.";
}

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("signin");

  // Send anyone who already has a live session straight into the app, and react
  // to a session arriving (sign-in, token restore) without racing the redirect.
  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (active && data.user) {
          await ensureWorkspace(data.user);
          navigate({ to: "/dashboard", replace: true });
        }
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
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      }));
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      if (!data.session) {
        toast.error("Sign-in didn't complete. Please try again.");
        return;
      }
      await ensureWorkspace(data.user);
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(friendlyError(error instanceof Error ? error.message : "network"));
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const target = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(target)) {
      toast.error("Enter your email above, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      }));
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      toast.success("If that email has an account, a reset link is on its way.");
    } catch (error) {
      toast.error(friendlyError(error instanceof Error ? error.message : "network"));
    } finally {
      setBusy(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const normalizedSlug = slugify(businessSlug || businessName);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (password.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    if (businessName.trim().length < 2 || businessName.trim().length > 120) {
      toast.error("Business name must be between 2 and 120 characters.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug) || normalizedSlug.length < 3 || normalizedSlug.length > 60) {
      toast.error("Business URL must be 3–60 lowercase letters, numbers or hyphens.");
      return;
    }
    setBusy(true);
    queryClient.clear();
    try {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName.trim(),
            pending_business_name: businessName.trim(),
            pending_business_slug: normalizedSlug,
          },
        },
      }));
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      if (data.user && data.user.identities?.length === 0) {
        toast.error("This email is already registered. Try signing in or reset your password.");
        setTab("signin");
        return;
      }
      if (data.session) {
        if (!data.user) throw new Error("Something went wrong. Please try again.");
        await ensureWorkspace(data.user);
        toast.success("Account created.");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      toast.success("Check your email to confirm your account, then sign in.");
      setTab("signin");
      setPassword("");
      setConfirmation("");
    } catch (error) {
      toast.error(friendlyError(error instanceof Error ? error.message : "network"));
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
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
              <button
                type="button"
                onClick={forgotPassword}
                disabled={busy}
                className="block w-full text-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form className="space-y-4" onSubmit={signUp}>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    setBusinessSlug(slugify(e.target.value).slice(0, 60));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-slug">Business URL</Label>
                <Input
                  id="business-slug"
                  required
                  minLength={3}
                  maxLength={60}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={businessSlug}
                  onChange={(e) => setBusinessSlug(slugify(e.target.value).slice(0, 60))}
                />
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
                <PasswordInput
                  id="password2"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-rules"
                />
                <p id="password-rules" className="text-xs text-muted-foreground">
                  Use at least 12 characters, mixing words, numbers and symbols. Avoid common or reused passwords.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
