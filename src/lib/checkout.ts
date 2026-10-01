import { toast } from "sonner";
import type { PlanId } from "@/lib/plans";

export type BillingCycle = "monthly" | "annual";
export const ANNUAL_BILLING_AVAILABLE = false;
export const CHECKOUT_UNAVAILABLE =
  "Payment checkout is not available yet. Please try again later.";
const SELECTION_KEY = "dmrj-selected-plan";

/** Keeps the customer's choice for a future checkout, without changing any subscription data. */
export function selectPlan(plan: PlanId, cycle: BillingCycle = "monthly") {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SELECTION_KEY, JSON.stringify({ plan, cycle }));
  }
  toast.info(CHECKOUT_UNAVAILABLE);
}

export function getSelectedPlan(): { plan: PlanId; cycle: BillingCycle } | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SELECTION_KEY) ?? "null");
    if (!["starter", "pro", "business"].includes(value?.plan)) return null;
    return {
      plan: value.plan,
      cycle: value.cycle === "annual" && ANNUAL_BILLING_AVAILABLE ? "annual" : "monthly",
    };
  } catch {
    return null;
  }
}
