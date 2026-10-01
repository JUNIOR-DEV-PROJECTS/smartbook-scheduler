import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_LIST } from "@/lib/plans";
import { selectPlan } from "@/lib/checkout";

/** Shown when the complimentary credits run out. */
export function UpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Your complimentary credits are used up</DialogTitle>
          <DialogDescription>
            New accounts get 2 complimentary credits. Choose a plan to keep booking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <span className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Monthly</span>
          <span className="text-muted-foreground" aria-disabled="true">
            Annual — Annual billing is coming soon.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <div key={plan.id} className="surface flex flex-col p-5">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
              <p className="mt-4 text-3xl font-semibold">
                ${plan.price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-5" onClick={() => selectPlan(plan.id, "monthly")}>
                Choose {plan.name}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Payment checkout is not available yet.
        </p>
      </DialogContent>
    </Dialog>
  );
}
