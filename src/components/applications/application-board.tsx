"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  allowedStatusTransitions,
  applicationStatuses,
  type ApplicationStatus,
} from "@/server/applications/contracts";

type ApplicationRow = {
  application: { id: string; status: ApplicationStatus; notes: string | null };
  job: { id: string; title: string; companyName: string; locationText: string | null };
};

export function ApplicationBoard() {
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [message, setMessage] = useState("Loading applications...");

  async function load() {
    const response = await fetch("/api/applications", { cache: "no-store" });
    if (!response.ok) return setMessage("We could not load your applications.");
    setRows(((await response.json()) as { data: ApplicationRow[] }).data);
    setMessage("");
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
    if (!response.ok) return setMessage("That status change could not be saved.");
    await load();
  }

  return (
    <section className="application-board" aria-labelledby="tracker-title">
      <header className="tracker-header">
        <p className="eyebrow">Application tracker</p>
        <h1 id="tracker-title">Keep every application moving.</h1>
        <p>Update progress manually. Every status change is retained in history.</p>
      </header>
      {message ? <p role="status">{message}</p> : null}
      <div className="kanban-board">
        {applicationStatuses
          .filter((status) => status !== "discovered")
          .map((status) => (
            <section className="kanban-column" key={status} aria-labelledby={`column-${status}`}>
              <h2 id={`column-${status}`}>
                {status}
                <span>{rows.filter((row) => row.application.status === status).length}</span>
              </h2>
              <ul>
                {rows
                  .filter((row) => row.application.status === status)
                  .map((row) => (
                    <li className="application-card" key={row.application.id}>
                      <strong>{row.job.title}</strong>
                      <span>{row.job.companyName}</span>
                      <span>{row.job.locationText ?? "Location not listed"}</span>
                      <Link
                        href={`/applications/${row.application.id}`}
                        style={{
                          display: "inline-block",
                          marginTop: "0.5rem",
                          color: "var(--accent)",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        ⚡ Open Assistant →
                      </Link>
                      {allowedStatusTransitions[row.application.status].length ? (
                        <label>
                          Move to
                          <select
                            value=""
                            onChange={(event) => {
                              if (event.target.value)
                                void changeStatus(
                                  row.application.id,
                                  event.target.value as ApplicationStatus,
                                );
                            }}
                          >
                            <option value="">Choose status</option>
                            {allowedStatusTransitions[row.application.status].map((next) => (
                              <option key={next} value={next}>
                                {next}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <span className="application-final">Final status</span>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
      </div>
    </section>
  );
}
