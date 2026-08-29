import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";

type ButtonVariant =
  "primary" | "secondary" | "outline" | "light" | "light-outline";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-dark hover:-translate-y-0.5 focus-visible:bg-brand-dark",
  secondary:
    "bg-ink text-white shadow-sm hover:bg-slate-800 hover:-translate-y-0.5 focus-visible:bg-slate-800",
  outline:
    "border border-line bg-transparent text-ink hover:border-brand hover:bg-brand-soft focus-visible:border-brand",
  light:
    "bg-[#f3efe6] text-night hover:bg-white hover:-translate-y-0.5 focus-visible:bg-white",
  "light-outline":
    "border border-white/40 bg-white/10 text-white hover:border-white/70 hover:bg-white/16 hover:-translate-y-0.5 focus-visible:border-white",
};

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
};

export function ButtonLink({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`rounded-control inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-bold tracking-[0.01em] transition-[color,background-color,border-color,transform,box-shadow] duration-300 ease-out ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
