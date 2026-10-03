import { ANNUAL_BILLING_AVAILABLE, type BillingCycle } from "@/lib/checkout";
import { cn } from "@/lib/utils";

export function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  const opt = (cycle: BillingCycle, label: string, disabled = false) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === cycle}
      disabled={disabled}
      onClick={() => onChange(cycle)}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
        value === cycle ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-lg border border-border p-1">
        {opt("monthly", "Monthly")}
        {opt("annual", "Annual", !ANNUAL_BILLING_AVAILABLE)}
      </div>
      {!ANNUAL_BILLING_AVAILABLE ? (
        <span className="text-sm text-muted-foreground">Annual billing is coming soon.</span>
      ) : null}
    </div>
  );
}
