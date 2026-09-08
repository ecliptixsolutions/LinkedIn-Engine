import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "warning" | "success";
}) {
  const tones: Record<string, string> = {
    default: "border-border bg-card",
    primary: "border-primary/30 bg-primary/5",
    warning: "border-warning/40 bg-warning/10",
    success: "border-success/35 bg-success/10",
  };
  const iconTones: Record<string, string> = {
    default: "bg-foreground text-background",
    primary: "bg-primary text-primary-foreground",
    warning: "bg-warning text-warning-foreground",
    success: "bg-success text-success-foreground",
  };
  return (
    <div
      className={cn(
        "rounded-lg border p-5 shadow-sm transition-shadow hover:shadow-md",
        tones[tone],
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-lg shadow-sm",
              iconTones[tone],
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
}
