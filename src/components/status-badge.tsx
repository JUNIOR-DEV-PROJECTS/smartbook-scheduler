import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/hooks/useWorkspace";

const STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/25",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  no_show: "bg-destructive/10 text-destructive border-destructive/25",
};

const LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {LABELS[status]}
    </Badge>
  );
}

export const STATUS_LABELS = LABELS;
