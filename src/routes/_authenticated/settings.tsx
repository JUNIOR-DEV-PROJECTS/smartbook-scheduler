import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, RequireManager } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings — DMRJ Scheduling" },
    { name: "description", content: "Settings in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices." },
    { property: "og:title", content: "Settings — DMRJ Scheduling" },
    { property: "og:description", content: "Appointment scheduling software for salons, clinics, spas and practices." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const business = workspace?.business;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    description: "",
    reminder_hours: 24,
    is_published: true,
    notify_confirmation: true,
    notify_reminder: true,
    notify_cancellation: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!business) return;
    setForm({
      name: business.name,
      phone: business.phone ?? "",
      email: business.email ?? "",
      address: business.address ?? "",
      city: business.city ?? "",
      description: business.description ?? "",
      reminder_hours: business.reminder_hours,
      is_published: business.is_published,
      notify_confirmation: business.notify_confirmation,
      notify_reminder: business.notify_reminder,
      notify_cancellation: business.notify_cancellation,
    });
  }, [business]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setBusy(true);
    const { error } = await supabase.from("businesses").update(form).eq("id", business.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["workspace"] });
    toast.success("Settings saved.");
  }

  return (
    <AppShell title="Settings" description="Business details and notifications">
      {workspace && business ? (
        <RequireManager role={workspace.role}>
          <form onSubmit={save} className="surface max-w-2xl space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
              <Field label="Reminder hours before">
                <Input
                  type="number"
                  min={1}
                  value={form.reminder_hours}
                  onChange={(e) =>
                    setForm({ ...form, reminder_hours: Number(e.target.value) || 24 })
                  }
                />
              </Field>
            </div>

            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            <div className="space-y-3">
              <Toggle
                label="Booking page visible"
                checked={form.is_published}
                onChange={(v) => setForm({ ...form, is_published: v })}
              />
              <Toggle
                label="Send confirmations"
                checked={form.notify_confirmation}
                onChange={(v) => setForm({ ...form, notify_confirmation: v })}
              />
              <Toggle
                label="Send reminders"
                checked={form.notify_reminder}
                onChange={(v) => setForm({ ...form, notify_reminder: v })}
              />
              <Toggle
                label="Send cancellation notices"
                checked={form.notify_cancellation}
                onChange={(v) => setForm({ ...form, notify_cancellation: v })}
              />
            </div>

            <Button disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
          </form>
        </RequireManager>
      ) : null}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
