"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type EmailRow = {
  id: string;
  sender: string;
  subject: string | null;
  snippet: string | null;
  receivedAt: string;
  classification: string | null;
  classificationConfidence: string | null;
  matchStatus: "unmatched" | "pending_confirmation" | "matched" | "ignored";
  applicationId: string | null;
};

const categoryIcon: Record<string, string> = {
  application_confirmation: "✓",
  interview_invitation: "📅",
  assessment: "⚠",
  rejection: "✕",
  offer: "🎉",
  recruiter_message: "✉",
  application_follow_up: "↻",
  other: "•",
};

export function EmailList() {
  const [emails, setEmails] = useState<EmailRow[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const showToast = useToast();

  async function load() {
    const response = await fetch("/api/emails", { cache: "no-store" });
    if (response.ok) setEmails(((await response.json()) as { data: EmailRow[] }).data);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function sync() {
    setSyncing(true);
    const response = await fetch("/api/gmail/sync", { method: "POST" });
    setSyncing(false);
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      showToast(
        result?.error?.code === "GMAIL_NOT_CONNECTED"
          ? "Connect Gmail from your dashboard first."
          : (result?.error?.message ?? "Sync failed."),
        "error",
      );
      return;
    }
    showToast("Gmail synced.", "success");
    await load();
  }

  async function confirm(id: string) {
    const response = await fetch(`/api/emails/${id}/confirm`, { method: "POST" });
    if (response.ok) {
      showToast("Confirmed and applied to your tracker.", "success");
      await load();
    }
  }

  async function ignore(id: string) {
    const response = await fetch(`/api/emails/${id}/ignore`, { method: "POST" });
    if (response.ok) await load();
  }

  if (emails === null) return <SkeletonList rows={4} />;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-semibold text-ink">Job emails</h1>
        <Button type="button" size="sm" onClick={sync} disabled={syncing}>
          {syncing ? "Syncing..." : "Sync Gmail"}
        </Button>
      </div>

      {emails.length === 0 ? (
        <EmptyState
          title="No job-related emails yet."
          description="Connect Gmail from your dashboard, then sync to see application confirmations, interview invitations, and more here."
        />
      ) : (
        <ul className="grid gap-3">
          {emails.map((email) => (
            <li key={email.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="m-0 font-semibold text-ink">{email.subject ?? "(no subject)"}</p>
                  <p className="m-0 text-sm text-muted">{email.sender}</p>
                </div>
                {email.classification ? (
                  <Badge tone="accent">
                    {categoryIcon[email.classification] ?? "•"} {email.classification.replaceAll("_", " ")}
                  </Badge>
                ) : null}
              </div>
              {email.snippet ? <p className="mt-2 text-sm text-muted">{email.snippet}</p> : null}
              {email.matchStatus === "pending_confirmation" ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-muted">Possible match to one of your applications.</span>
                  <Button type="button" size="sm" onClick={() => confirm(email.id)}>
                    Confirm
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => ignore(email.id)}>
                    Ignore
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
