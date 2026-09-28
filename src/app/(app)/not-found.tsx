import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <EmptyState
        title="We couldn't find that page."
        description="It may have been moved or the link may be out of date."
        action={
          <Link href="/dashboard" className="text-sm font-bold text-accent">
            Back to your workspace →
          </Link>
        }
      />
    </main>
  );
}
