import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-surface p-4 sm:p-5", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "danger" }) {
  const toneClasses = {
    neutral: "bg-line/60 text-ink",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        toneClasses,
        className,
      )}
      {...props}
    />
  );
}
