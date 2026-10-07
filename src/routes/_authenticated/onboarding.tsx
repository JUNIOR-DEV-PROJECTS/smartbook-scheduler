import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — DMRJ Scheduling" },
      {
        name: "description",
        content:
          "Onboarding in DMRJ Scheduling. Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:title", content: "Onboarding — DMRJ Scheduling" },
      {
        property: "og:description",
        content: "Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("salon");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("You need to sign in again.");

       const normalizedSlug = slugify(slug || name);
       if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug) || normalizedSlug.length < 3 || normalizedSlug.length > 60) {
         throw new Error("Business URL must be 3–60 lowercase letters, numbers or hyphens.");
       }
      const { data: business, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name,
          slug: normalizedSlug,
          business_type: type,
          city,
          address,
          description,
          timezone,
          onboarding_completed: true,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("business_members")
        .insert({ business_id: business.id, user_id: userId, role: "owner" });

      await queryClient.invalidateQueries();
      toast.success("Your business is ready.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-5 py-12">
      <form onSubmit={submit} className="surface w-full max-w-lg space-y-5 p-7">
        <div>
          <h1 className="font-display text-2xl font-semibold">Set up your business</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your workspace. You can add hours, staff and services from the dashboard.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bname">Business name</Label>
          <Input id="bname" required value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value).slice(0, 60)); }} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bslug">Business URL</Label>
          <Input id="bslug" required minLength={3} maxLength={60} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(e) => setSlug(slugify(e.target.value).slice(0, 60))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="btype">Type</Label>
          <Input
            id="btype"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="salon, clinic, spa…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="baddr">Address</Label>
            <Input id="baddr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcity">City</Label>
            <Input id="bcity" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bdesc">Short description</Label>
          <Textarea
            id="bdesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Time zone detected: {timezone}</p>
        <Button className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create business"}
        </Button>
      </form>
    </div>
  );
}
