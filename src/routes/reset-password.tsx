import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — DMRJ Scheduling" },
      { name: "description", content: "Choose a new password for your DMRJ Scheduling account." },
      { property: "og:title", content: "Reset password — DMRJ Scheduling" },
      { property: "og:description", content: "Choose a new password for your DMRJ Scheduling account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setTimeout(() => setReady((r) => r ?? false), 2500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      toast.error("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const message = error.message.toLowerCase();
        toast.error(
          message.includes("weak") || message.includes("pwned") || message.includes("easy to guess")
            ? "This password is too common or has appeared in data leaks. Use at least 12 characters, mixing words, numbers and symbols."
            : error.message,
        );
        return;
      }
      toast.success("Your password has been updated.");
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Couldn't update your password. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-12">
      <div className="surface w-full max-w-md p-7">
        <h1 className="font-display text-2xl font-semibold text-primary">Set a new password</h1>
        {ready === false ? (
          <div className="mt-4 space-y-4 text-sm text-muted-foreground">
            <p>This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
            <Button asChild variant="outline">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : ready === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput id="new-password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="reset-password-rules" />
              <p id="reset-password-rules" className="text-xs text-muted-foreground">
                Use at least 12 characters, mixing words, numbers and symbols.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <PasswordInput id="confirm-new-password" autoComplete="new-password" required minLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
