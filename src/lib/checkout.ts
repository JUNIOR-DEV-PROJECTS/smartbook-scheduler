import { toast } from "sonner";
import type { PlanId } from "@/lib/plans";

export type BillingCycle = "monthly" | "annual";
export const ANNUAL_BILLING_AVAILABLE = false;
export const CHECKOUT_UNAVAILABLE =
  "Payment checkout is not available yet. Please try again later.";
const SELECTION_KEY = "dmrj-selected-plan";

/** Remembers plan + cycle (survives reloads) without changing any subscription data. */
export function saveSelection(plan: PlanId | null, cycle: BillingCycle) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTION_KEY, JSON.stringify({ plan, cycle }));
}

/** Keeps the customer's choice for a future checkout, without changing any subscription data. */
export function selectPlan(plan: PlanId, cycle: BillingCycle = "monthly") {
  const safeCycle: BillingCycle = cycle === "annual" && ANNUAL_BILLING_AVAILABLE ? "annual" : "monthly";
  saveSelection(plan, safeCycle);
  toast.info(CHECKOUT_UNAVAILABLE);
}

export function getSelectedPlan(): { plan: PlanId | null; cycle: BillingCycle } | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(SELECTION_KEY) ?? "null");
    if (!value) return null;
    const plan = ["starter", "pro", "business"].includes(value.plan) ? (value.plan as PlanId) : null;
    return {
      plan,
      cycle: value.cycle === "annual" && ANNUAL_BILLING_AVAILABLE ? "annual" : "monthly",
    };
  } catch {
    return null;
  }
}
