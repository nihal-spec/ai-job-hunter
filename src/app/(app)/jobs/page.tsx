import Link from "next/link";

import { jobSearchInput, parseJobSearch } from "@/server/jobs/query";
import { SaveButton } from "@/components/jobs/save-button";
import { searchJobs } from "@/server/jobs/repository";
import { requireSession } from "@/server/auth/session";

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function scoreLabel(score: string | null | undefined) {
  if (!score) return "Not matched";
  return `${Math.round(Number(score))}% recommendation`;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const session = await requireSession();
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    const item = first(value);
    if (item) query.set(key, item);
  }
  const parsed = parseJobSearch(query);
  const search = parsed.success ? parsed.data : jobSearchInput.parse({});
  const result = await searchJobs(session.user.id, search);

  return (
    <main className="jobs-shell">
      <header className="jobs-header">
        <div>
          <p className="eyebrow">Job discovery</p>
          <h1>Find work worth your attention.</h1>
          <p>
            Search the active catalog and compare roles using your internal recommendation score.
          </p>
        </div>
      </header>
      <form className="job-filters" method="get">
        <label>
          Search
          <input name="q" defaultValue={search.q} placeholder="Role, company, or keyword" />
        </label>
        <label>
          Location
          <input
            name="location"
            defaultValue={search.location}
            placeholder="Remote, India, Bengaluru"
          />
        </label>
        <label>
          Workplace
          <select name="workplaceMode" defaultValue={search.workplaceMode ?? ""}>
            <option value="">Any workplace</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </form>
      <div className="jobs-result-bar">
        <span>{result.jobs.length} roles in this view</span>
        <span>Scores are recommendations, not hiring probabilities.</span>
      </div>
      {result.jobs.length ? (
        <ul className="job-list">
          {result.jobs.map((job) => (
            <li key={job.id} className="job-card">
              <div className="job-card-main">
                <p className="job-company">{job.companyName}</p>
                <h2>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </h2>
                <p className="job-meta">
                  {job.locationText ?? "Location not listed"} ·{" "}
                  {job.workplaceMode ?? "Workplace not listed"}
                  {job.employmentType ? ` · ${job.employmentType}` : ""}
                </p>
                <p className="job-excerpt">
                  {job.description.slice(0, 220)}
                  {job.description.length > 220 ? "..." : ""}
                </p>
              </div>
              <div className="job-card-score">
                <strong>{scoreLabel(job.match?.overallScore)}</strong>
                <span>
                  {job.match
                    ? job.match.recommendation
                    : "Match this role after setting up your profile."}
                </span>
                <SaveButton jobId={job.id} initialSaved={job.saved} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <section className="jobs-empty">
          <h2>No active roles match these filters.</h2>
          <p>Try a broader search or check back after the next permitted source refresh.</p>
        </section>
      )}
      {result.nextCursor ? (
        <Link
          className="next-page"
          href={`/jobs?${new URLSearchParams({ ...Object.fromEntries(query), cursor: result.nextCursor }).toString()}`}
        >
          Load more roles
        </Link>
      ) : null}
    </main>
  );
}
