"use client";

import { useState } from "react";

export function SaveButton({
  jobId,
  initialSaved = false,
}: {
  jobId: string;
  initialSaved?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const response = await fetch(`/api/jobs/${jobId}/save`, { method: saved ? "DELETE" : "POST" });
    if (response.ok) setSaved(!saved);
    setPending(false);
  }

  return (
    <button className="save-button" type="button" onClick={toggle} disabled={pending}>
      {pending ? "Saving..." : saved ? "Saved" : "Save job"}
    </button>
  );
}
