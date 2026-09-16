import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Clock4,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  Scissors,
  Settings,
  Users,
  UserSquare2,
  LogOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { ROLE_LABEL, useWorkspace, type AppRole } from "@/hooks/useWorkspace";
import { isPaidPlan, useCredits } from "@/hooks/useCredits";
import { UpgradeDialog } from "@/components/upgrade-dialog";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/appointments", label: "Appointments", icon: ListChecks },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/staff", label: "Staff", icon: UserSquare2 },
  { to: "/services", label: "Services", icon: Scissors },
  { to: "/availability", label: "Availability", icon: Clock4 },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** Pages only owners and admins may open. */
const MANAGER_ONLY = new Set<string>([
  "/staff",
  "/services",
  "/availability",
  "/locations",
  "/reports",
  "/billing",
  "/settings",
]);

function NavLinks({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter(
    (n) => role === "owner" || role === "manager" || !MANAGER_ONLY.has(n.to),
  );
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { data: workspace, isLoading, isError } = useWorkspace();
  const { data: credits } = useCredits();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-4 p-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">We couldn't load your workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button className="mt-4" onClick={() => queryClient.invalidateQueries()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="surface max-w-md p-8">
          <h1 className="text-lg font-semibold">No business yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your business to open the dashboard. If you were invited to a team, ask the
            owner to add you again.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild>
              <Link to="/onboarding">Set up my business</Link>
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { business, role } = workspace;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-3 py-5">
        <Link to="/dashboard" className="font-display text-lg font-semibold text-primary">
          Cadence
        </Link>
        <p className="mt-1 truncate text-xs text-muted-foreground">{business.name}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <NavLinks role={role} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{business.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {sidebar}
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
              {description ? (
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isPaidPlan(business.plan_status) && credits !== null && credits !== undefined ? (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="hidden sm:inline-flex"
              >
                <Badge variant={credits > 0 ? "secondary" : "destructive"}>
                  {credits > 0 ? `${credits} credits left` : "Out of credits — upgrade"}
                </Badge>
              </button>
            ) : null}
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {initials(business.name)} · {ROLE_LABEL[role]}
            </Badge>
            {actions}
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
}

export function RequireManager({ role, children }: { role: AppRole; children: ReactNode }) {
  if (role === "owner" || role === "manager") return <>{children}</>;
  return (
    <div className="surface p-8 text-center">
      <h2 className="text-base font-semibold">You don't have access to this page</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask an owner or admin of this business if you need it.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

export { NAV };
