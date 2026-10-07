import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { buildSlots, weekdayOf, toDateISO, type Interval } from "@/lib/scheduling";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useCustomers,
  useServices,
  useStaff,
  type AppointmentRow,
  type Business,
} from "@/hooks/useWorkspace";

interface Props {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog reschedules this appointment instead of creating one. */
  appointment?: AppointmentRow | null;
  defaultDate?: string;
}

const NEW_CUSTOMER = "__new__";

export function AppointmentDialog({
  business,
  open,
  onOpenChange,
  appointment,
  defaultDate,
}: Props) {
  const queryClient = useQueryClient();
  const tz = business.timezone || "UTC";

  const [dateISO, setDateISO] = useState(defaultDate ?? toDateISO(new Date(), tz));
  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [slot, setSlot] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<string>(NEW_CUSTOMER);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: services, isLoading: loadingServices } = useServices(business.id);
  const { data: staffList, isLoading: loadingStaff } = useStaff(business.id);
  const { data: customers } = useCustomers(business.id);

  const activeServices = useMemo(() => (services ?? []).filter((s) => s.is_active), [services]);
  const activeStaff = useMemo(() => (staffList ?? []).filter((s) => s.is_active), [staffList]);

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setDateISO(toDateISO(new Date(appointment.starts_at), tz));
      setServiceId(appointment.service_id ?? "");
      setStaffId(appointment.staff_id);
      setSlot(new Date(appointment.starts_at).getTime());
      setCustomerId(appointment.customer_id ?? NEW_CUSTOMER);
      setNotes(appointment.notes ?? "");
    } else {
      setDateISO(defaultDate ?? toDateISO(new Date(), tz));
      setSlot(null);
      setNotes("");
      setCustomerId(NEW_CUSTOMER);
      setName("");
      setEmail("");
      setPhone("");
    }
  }, [open, appointment, defaultDate, tz]);

  useEffect(() => {
    if (!serviceId && activeServices[0]) setServiceId(activeServices[0].id);
    if (!staffId && activeStaff[0]) setStaffId(activeStaff[0].id);
  }, [activeServices, activeStaff, serviceId, staffId]);

  const service = activeServices.find((s) => s.id === serviceId);
  const duration = (service?.duration_minutes ?? 30) + (service?.buffer_minutes ?? 0);

  const availability = useQuery({
    queryKey: ["slot-inputs", business.id, staffId, dateISO],
    enabled: open && !!staffId && !!dateISO,
    queryFn: async () => {
      const weekday = weekdayOf(dateISO);
      const dayStart = new Date(`${dateISO}T00:00:00Z`).getTime() - 36 * 3600_000;
      const dayEnd = dayStart + 72 * 3600_000;

      const [hours, shifts, timeOff, appts] = await Promise.all([
        supabase
          .from("business_hours")
          .select("open_time, close_time, is_closed")
          .eq("business_id", business.id)
          .eq("weekday", weekday)
          .maybeSingle(),
        supabase
          .from("staff_availability")
          .select("start_time, end_time")
          .eq("staff_id", staffId)
          .eq("weekday", weekday),
        supabase
          .from("staff_time_off")
          .select("starts_at, ends_at")
          .eq("staff_id", staffId)
          .lt("starts_at", new Date(dayEnd).toISOString())
          .gt("ends_at", new Date(dayStart).toISOString()),
        supabase
          .from("appointments")
          .select("id, starts_at, ends_at, status")
          .eq("staff_id", staffId)
          .in("status", ["pending", "confirmed"])
          .gte("starts_at", new Date(dayStart).toISOString())
          .lt("starts_at", new Date(dayEnd).toISOString()),
      ]);

      const busyIntervals: Interval[] = [
        ...(timeOff.data ?? []).map((t) => ({
          start: new Date(t.starts_at).getTime(),
          end: new Date(t.ends_at).getTime(),
        })),
        ...(appts.data ?? [])
          .filter((a) => a.id !== appointment?.id)
          .map((a) => ({
            start: new Date(a.starts_at).getTime(),
            end: new Date(a.ends_at).getTime(),
          })),
      ];

      return {
        closed: hours.data?.is_closed ?? false,
        open: hours.data?.open_time ?? "00:00",
        close: hours.data?.close_time ?? "23:59",
        shifts: shifts.data ?? [],
        busy: busyIntervals,
      };
    },
  });

  const slots = useMemo(() => {
    const a = availability.data;
    if (!a || a.closed) return [];
    const windows = (a.shifts.length ? a.shifts : [{ start_time: a.open, end_time: a.close }]).map(
      (w) => ({
        start_time: w.start_time < a.open ? a.open : w.start_time,
        end_time: w.end_time > a.close ? a.close : w.end_time,
      }),
    );
    return buildSlots({
      dateISO,
      timeZone: tz,
      windows: windows.filter((w) => w.start_time < w.end_time),
      busy: a.busy,
      durationMinutes: duration,
      notBefore: appointment ? 0 : Date.now(),
    });
  }, [availability.data, dateISO, tz, duration, appointment]);

  const endsAt = slot ? new Date(slot + duration * 60000) : null;

  async function save() {
    if (!slot || !service || !staffId) {
      toast.error("Pick a service, a team member and an available time.");
      return;
    }
    setBusy(true);
    try {
      let finalCustomerId: string | null =
        customerId === NEW_CUSTOMER ? null : customerId;

      if (!appointment && customerId === NEW_CUSTOMER) {
        if (!name.trim()) throw new Error("Add the customer's name.");
        const { data: created, error: cErr } = await supabase
          .from("customers")
          .insert({
            business_id: business.id,
            full_name: name.trim(),
            email: email || null,
            phone: phone || null,
          })
          .select()
          .single();
        if (cErr) throw cErr;
        finalCustomerId = created.id;
      }

      const payload = {
        business_id: business.id,
        staff_id: staffId,
        service_id: service.id,
        customer_id: finalCustomerId,
        starts_at: new Date(slot).toISOString(),
        ends_at: new Date(slot + duration * 60000).toISOString(),
        price_cents: service.price_cents,
        notes: notes || null,
      };

      const { error } = appointment
        ? await supabase.from("appointments").update(payload).eq("id", appointment.id)
        : await supabase.from("appointments").insert(payload);

      if (error) {
        if (error.code === "23P01" || /exclusion|overlap/i.test(error.message)) {
          throw new Error("That slot was just taken for this team member. Pick another time.");
        }
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(appointment ? "Appointment updated." : "Appointment booked.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the appointment");
    } finally {
      setBusy(false);
    }
  }

  const loading = loadingServices || loadingStaff;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? "Edit appointment" : "New appointment"}</DialogTitle>
          <DialogDescription>
            Times shown in {tz}. Only genuinely free slots can be picked.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : activeServices.length === 0 || activeStaff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add at least one service and one team member before booking.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={serviceId}
                  onValueChange={(v) => {
                    setServiceId(v);
                    setSlot(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeServices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {s.duration_minutes}m · {money(s.price_cents, business.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team member</Label>
                <Select
                  value={staffId}
                  onValueChange={(v) => {
                    setStaffId(v);
                    setSlot(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={dateISO}
                onChange={(e) => {
                  setDateISO(e.target.value);
                  setSlot(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Available times</Label>
              {availability.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : slots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No free time on this date for this team member. Try another day, a shorter
                  service, or check their working hours.
                </p>
              ) : (
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                  {slots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSlot(t)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        slot === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-secondary",
                      )}
                    >
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: tz,
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(t))}
                    </button>
                  ))}
                </div>
              )}
              {endsAt ? (
                <p className="text-xs text-muted-foreground">
                  Ends at{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone: tz,
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(endsAt)}{" "}
                  ({duration} minutes)
                </p>
              ) : null}
            </div>

            {!appointment ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NEW_CUSTOMER}>New customer</SelectItem>
                      {(customers ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {customerId === NEW_CUSTOMER ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || !slot || outOfCredits}>
            {busy ? "Saving…" : appointment ? "Save changes" : "Book appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
