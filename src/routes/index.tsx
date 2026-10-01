import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Clock, Users, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_LIST } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DMRJ Scheduling — Smart scheduling for modern businesses." },
      {
        name: "description",
        content: "Appointment scheduling software for salons, clinics, spas and practices.",
      },
      {
        property: "og:title",
        content: "DMRJ Scheduling — Smart scheduling for modern businesses.",
      },
      {
        property: "og:description",
        content: "Appointment scheduling software for salons, clinics, spas and practices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const highlights = [
  {
    icon: CalendarCheck,
    title: "One shared calendar",
    body: "Day, week and month views with every staff member in their own column.",
  },
  {
    icon: ShieldCheck,
    title: "No double bookings",
    body: "Overlapping appointments are blocked by the database itself, not just the screen.",
  },
  {
    icon: Users,
    title: "Customers remembered",
    body: "Visit history, spend, no-shows, tags and private notes on every client.",
  },
  {
    icon: Clock,
    title: "Real availability",
    body: "Opening hours, staff shifts, breaks and time off feed the booking page.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="font-display text-xl font-semibold text-primary">DMRJ Scheduling</span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-20">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Scheduling software
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold sm:text-6xl">
            Smart scheduling for modern businesses.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Appointment scheduling software for salons, clinics, spas and practices.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/40 py-14">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h) => (
              <div key={h.title} className="surface p-5">
                <h.icon className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="mt-3 text-base font-semibold">{h.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-semibold">Simple monthly plans</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {PLAN_LIST.map((plan) => (
              <div key={plan.id} className="surface flex flex-col p-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-semibold">
                  ${plan.price}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Payment checkout is not available yet.
          </p>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} DMRJ Scheduling
      </footer>
    </div>
  );
}
