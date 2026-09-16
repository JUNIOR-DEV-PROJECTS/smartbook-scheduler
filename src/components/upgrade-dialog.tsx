import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLAN_LIST, annualPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Shown when the complimentary credits run out. */
export function UpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Your complimentary credits are used up</DialogTitle>
          <DialogDescription>
            New accounts get 2 complimentary credits. Choose a plan to keep booking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-border p-1">
            {(["monthly", "annual"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                  cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {c === "annual" ? "Annual (2 months free)" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <div key={plan.id} className="surface flex flex-col p-5">
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
              <p className="mt-4 text-3xl font-semibold">
                ${cycle === "monthly" ? plan.price : annualPrice(plan)}
                <span className="text-sm font-normal text-muted-foreground">
                  {cycle === "monthly" ? "/mo" : "/yr"}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Card payments aren't switched on yet — contact us to activate a plan on your account.
        </p>
      </DialogContent>
    </Dialog>
  );
}
