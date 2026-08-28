import Link from "next/link";

import { SaveButton } from "@/components/jobs/save-button";
import { requireSession } from "@/server/auth/session";
import { listSavedJobs } from "@/server/saved-jobs/repository";

export default async function SavedJobsPage() {
  const session = await requireSession();
  const savedJobs = await listSavedJobs(session.user.id);
  return (
    <main className="jobs-shell">
      <header className="jobs-header">
        <p className="eyebrow">Your shortlist</p>
        <h1>Saved jobs</h1>
        <p>Roles you chose to keep in view.</p>
      </header>
      {savedJobs.length ? (
        <ul className="job-list">
          {savedJobs.map((job) => (
            <li key={job.id} className="job-card">
              <div className="job-card-main">
                <p className="job-company">{job.companyName}</p>
                <h2>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </h2>
                <p className="job-meta">
                  {job.locationText ?? "Location not listed"} ·{" "}
                  {job.workplaceMode ?? "Workplace not listed"}
                </p>
              </div>
              <div className="job-card-score">
                <strong>
                  {job.match
                    ? `${Math.round(Number(job.match.overallScore))}% recommendation`
                    : "Not matched"}
                </strong>
                <SaveButton jobId={job.id} initialSaved />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <section className="jobs-empty">
          <h2>Your shortlist is empty.</h2>
          <p>Save a role from discovery when you want to return to it.</p>
          <Link className="next-page" href="/jobs">
            Explore jobs
          </Link>
        </section>
      )}
    </main>
  );
}
