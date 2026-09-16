import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_LIST, annualPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Cadence scheduling plans" },
      {
        name: "description",
        content:
          "Cadence plans: Starter $19, Professional $39 and Business $79 a month, billed monthly or annually. New accounts get 2 complimentary credits.",
      },
      { property: "og:title", content: "Pricing — Cadence scheduling plans" },
      {
        property: "og:description",
        content:
          "Starter $19, Professional $39 and Business $79 a month. Two complimentary credits on sign-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link to="/" className="font-display text-xl font-semibold text-primary">
          Cadence
        </Link>
        <Button asChild size="sm">
          <Link to="/auth">Get started</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="mt-3 max-w-lg text-muted-foreground">
          Every new account starts with 2 complimentary credits. After that, pick the plan that
          fits your team.
        </p>

        <div className="mt-8 inline-flex rounded-lg border border-border p-1">
          {(["monthly", "annual"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm transition-colors",
                cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {c === "annual" ? "Annual · 2 months free" : "Monthly"}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLAN_LIST.map((plan) => (
            <div key={plan.id} className="surface flex flex-col p-6">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-5 text-4xl font-semibold">
                ${cycle === "monthly" ? plan.price : annualPrice(plan)}
                <span className="text-base font-normal text-muted-foreground">
                  {cycle === "monthly" ? "/mo" : "/yr"}
                </span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={plan.id === "pro" ? "default" : "outline"}>
                <Link to="/auth">Get started</Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
