import type { ComponentPropsWithoutRef } from "react";

type CardProps = ComponentPropsWithoutRef<"article">;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <article
      className={`rounded-card border-line bg-surface border p-5 sm:p-6 ${className}`}
      {...props}
    />
  );
}
