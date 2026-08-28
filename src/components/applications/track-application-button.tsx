"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackApplicationButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function track() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, status: "applying" }),
    });
    setPending(false);
    if (!response.ok && response.status !== 409) {
      setError("We could not add this application.");
      return;
    }
    router.push("/applications");
    router.refresh();
  }

  return (
    <div className="match-action">
      <button type="button" onClick={track} disabled={pending}>
        {pending ? "Adding..." : "Track application"}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
