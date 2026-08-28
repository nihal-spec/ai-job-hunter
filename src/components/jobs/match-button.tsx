"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MatchButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function calculate() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/match`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    setPending(false);
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(result?.error?.message ?? "We could not calculate this match.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="match-action">
      <button type="button" onClick={calculate} disabled={pending}>
        {pending ? "Calculating..." : "Calculate recommendation"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
