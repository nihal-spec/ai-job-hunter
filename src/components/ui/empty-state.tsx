import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="max-w-xl rounded-2xl border border-line bg-surface p-8 text-center sm:text-left">
      <h2 className="m-0 text-2xl font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-2 mb-0 leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
