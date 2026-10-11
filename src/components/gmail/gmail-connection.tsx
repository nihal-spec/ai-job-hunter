"use client";

import { useEffect, useState } from "react";

type GmailStatus = { connected: boolean; email?: string; connectedAt?: string };

export function GmailConnection() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [pending, setPending] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/gmail/status");
    if (response.ok) setStatus((await response.json()).data);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStatus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function disconnect() {
    setPending(true);
    await fetch("/api/gmail/disconnect", { method: "POST" });
    await loadStatus();
    setPending(false);
  }

  if (!status) return null;
  return (
    <section className="gmail-panel" aria-labelledby="gmail-heading">
      <div>
        <p className="eyebrow">Optional connection</p>
        <h2 id="gmail-heading">Gmail</h2>
        <p>{status.connected ? `Connected as ${status.email}` : "Connect Gmail to identify relevant job emails."}</p>
      </div>
      {status.connected ? (
        <button type="button" onClick={disconnect} disabled={pending}>
          {pending ? "Disconnecting..." : "Disconnect Gmail"}
        </button>
      ) : (
        <a className="primary-action" href="/api/gmail/connect">
          Connect Gmail
        </a>
      )}
    </section>
  );
}