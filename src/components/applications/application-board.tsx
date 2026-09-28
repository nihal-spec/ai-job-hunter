"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  allowedStatusTransitions,
  applicationStatuses,
  type ApplicationStatus,
} from "@/server/applications/contracts";
import { Badge } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { SkeletonList } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type ApplicationRow = {
  application: { id: string; status: ApplicationStatus; notes: string | null };
  job: { id: string; title: string; companyName: string; locationText: string | null };
};

export function ApplicationBoard() {
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  const showToast = useToast();

  async function load() {
    const response = await fetch("/api/applications", { cache: "no-store" });
    if (!response.ok) {
      showToast("We could not load your applications.", "error");
      return;
    }
    setRows(((await response.json()) as { data: ApplicationRow[] }).data);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function changeStatus(id: string, status: ApplicationStatus) {
    const response = await fetch(`/api/applications/${id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      showToast("That status change could not be saved.", "error");
      return;
    }
    showToast("Status updated.", "success");
    await load();
  }

  const columns = applicationStatuses.filter((status) => status !== "discovered");

  return (
    <section aria-labelledby="tracker-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <header className="max-w-2xl">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-accent">Application tracker</p>
        <h1 id="tracker-title" className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">
          Keep every application moving.
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          Update progress manually. Every status change is retained in history.
        </p>
      </header>

      {rows === null ? (
        <div className="mt-8">
          <SkeletonList rows={3} />
        </div>
      ) : (
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
          {columns.map((status) => {
            const columnRows = rows.filter((row) => row.application.status === status);
            return (
              <section
                key={status}
                aria-labelledby={`column-${status}`}
                className="min-h-56 w-[85vw] shrink-0 snap-start rounded-xl border border-line bg-white/60 p-4 sm:w-auto sm:shrink"
              >
                <h2 id={`column-${status}`} className="m-0 mb-3 flex items-center justify-between text-sm font-bold capitalize text-ink">
                  {status}
                  <span className="font-normal text-muted">{columnRows.length}</span>
                </h2>
                <ul className="m-0 grid list-none gap-3 p-0">
                  {columnRows.map((row) => (
                    <li key={row.application.id} className="grid gap-1.5 rounded-lg border border-line bg-surface p-3.5">
                      <strong className="text-ink">{row.job.title}</strong>
                      <span className="text-xs text-muted">{row.job.companyName}</span>
                      <span className="text-xs text-muted">{row.job.locationText ?? "Location not listed"}</span>
                      <Link href={`/applications/${row.application.id}`} className="mt-1 inline-block text-xs font-bold text-accent no-underline">
                        ⚡ Open Assistant →
                      </Link>
                      {allowedStatusTransitions[row.application.status].length ? (
                        <label className="mt-1.5 grid gap-1 text-xs font-bold text-muted">
                          Move to
                          <Select
                            value=""
                            onChange={(event) => {
                              if (event.target.value) void changeStatus(row.application.id, event.target.value as ApplicationStatus);
                            }}
                            className="text-sm font-normal"
                          >
                            <option value="">Choose status</option>
                            {allowedStatusTransitions[row.application.status].map((next) => (
                              <option key={next} value={next}>
                                {next}
                              </option>
                            ))}
                          </Select>
                        </label>
                      ) : (
                        <Badge tone="neutral" className="mt-1 w-fit">
                          Final status
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
