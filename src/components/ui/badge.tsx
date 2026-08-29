import type { ComponentPropsWithoutRef } from "react";

type BadgeTone = "brand" | "success" | "warning" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "border-brand/30 text-brand-dark",
  success: "border-success/30 text-success",
  warning: "border-warning/30 text-warning",
  neutral: "border-slate-400/35 text-slate-700",
};

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: BadgeTone;
};

export function Badge({
  children,
  className = "",
  tone = "brand",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center border-l px-3 py-1 text-[0.6875rem] font-bold tracking-[0.12em] uppercase ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
