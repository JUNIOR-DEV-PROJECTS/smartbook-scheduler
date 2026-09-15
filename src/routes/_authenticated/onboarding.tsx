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
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
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

      const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: business, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name,
          slug,
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

      await supabase.from("business_hours").insert(
        [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          business_id: business.id,
          weekday,
          open_time: "09:00",
          close_time: "17:00",
          is_closed: weekday === 0,
        })),
      );

      const { data: staff } = await supabase
        .from("staff")
        .insert({
          business_id: business.id,
          user_id: userId,
          full_name: auth.user?.user_metadata?.["full_name"] || "Me",
          email: auth.user?.email ?? null,
          title: "Owner",
        })
        .select()
        .single();

      if (staff) {
        await supabase.from("staff_availability").insert(
          [1, 2, 3, 4, 5].map((weekday) => ({
            business_id: business.id,
            staff_id: staff.id,
            weekday,
            start_time: "09:00",
            end_time: "17:00",
          })),
        );
      }

      await supabase.from("services").insert({
        business_id: business.id,
        name: "Standard appointment",
        duration_minutes: 45,
        price_cents: 5000,
      });

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
            We'll create your booking page, opening hours and a first service. You can change
            everything later.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bname">Business name</Label>
          <Input id="bname" required value={name} onChange={(e) => setName(e.target.value)} />
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
