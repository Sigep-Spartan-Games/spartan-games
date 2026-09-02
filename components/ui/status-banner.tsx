import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBannerProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
};

const styles = {
  info: "border-primary/20 bg-primary/[0.06] text-foreground",
  success: "border-success/25 bg-success/[0.07] text-foreground",
  warning: "border-warning/25 bg-warning/[0.08] text-foreground",
  error: "border-destructive/25 bg-destructive/[0.07] text-foreground",
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export function StatusBanner({
  variant = "info",
  title,
  className,
  children,
  ...props
}: StatusBannerProps) {
  const Icon = icons[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm",
        styles[variant],
        className,
      )}
      {...props}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          variant === "success" && "text-success",
          variant === "warning" && "text-warning",
          variant === "error" && "text-destructive",
          variant === "info" && "text-primary",
        )}
      />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn("leading-relaxed text-muted-foreground", title && "mt-0.5")}>
          {children}
        </div>
      </div>
    </div>
  );
}
