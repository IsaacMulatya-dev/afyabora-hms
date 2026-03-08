import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  iconClassName?: string;
}

export default function StatCard({ title, value, change, changeType = "neutral", icon, iconClassName }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold font-display text-card-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconClassName)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
