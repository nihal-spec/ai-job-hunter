"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function AdminRetryButton({ jobId }: { jobId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function retry() {
    setPending(true);
    await fetch(`/api/admin/processing-jobs/${jobId}/retry`, { method: "POST" });
    setPending(false);
    router.refresh();
  }

  return (
    <Button type="button" size="sm" variant="secondary" onClick={retry} disabled={pending}>
      Retry
    </Button>
  );
}
