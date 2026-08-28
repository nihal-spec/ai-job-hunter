import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MatchButton } from "@/components/jobs/match-button";
import { TrackApplicationButton } from "@/components/applications/track-application-button";
import { SaveButton } from "@/components/jobs/save-button";
import { requireSession } from "@/server/auth/session";
import { findJobDetail } from "@/server/jobs/repository";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const detail = await findJobDetail(session.user.id, id.data);
  if (!detail) notFound();
  const { job, match, sources, saved } = detail;
  const matchExplanation =
    match?.explanation && typeof match.explanation === "object"
      ? (match.explanation as Record<string, unknown>)
      : null;

  return (
    <main className="job-detail-shell">
      <Link className="back-link" href="/jobs">
        Back to discovery
      </Link>
      <header className="job-detail-header">
        <div>
          <p className="eyebrow">{job.companyName}</p>
          <h1>{job.title}</h1>
          <p className="job-meta">
            {job.locationText ?? "Location not listed"} ·{" "}
            {job.workplaceMode ?? "Workplace not listed"}
            {job.employmentType ? ` · ${job.employmentType}` : ""}
          </p>
        </div>
        <div className="detail-score">
          {match ? (
            <>
              <strong>{Math.round(Number(match.overallScore))}%</strong>
              <span>Internal recommendation score</span>
            </>
          ) : (
            <span>Not matched yet</span>
          )}
        </div>
      </header>
      <div className="job-detail-grid">
        <article className="job-description">
          <h2>Role overview</h2>
          <div className="plain-text">{job.description}</div>
        </article>
        <aside className="match-panel">
          <h2>Match review</h2>
          {match ? (
            <>
              <p>{match.recommendation}</p>
              <dl className="score-list">
                <div>
                  <dt>Skills</dt>
                  <dd>{Math.round(Number(match.skillsScore))}%</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{Math.round(Number(match.experienceScore))}%</dd>
                </div>
                <div>
                  <dt>Responsibilities</dt>
                  <dd>{Math.round(Number(match.responsibilitiesScore))}%</dd>
                </div>
                <div>
                  <dt>Preferences</dt>
                  <dd>{Math.round(Number(match.preferenceScore))}%</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{Math.round(Number(match.locationScore))}%</dd>
                </div>
              </dl>
              {matchExplanation?.experience ? (
                <p>
                  <strong>Experience:</strong> {String(matchExplanation.experience)}
                </p>
              ) : null}
              {matchExplanation?.location ? (
                <p>
                  <strong>Location:</strong> {String(matchExplanation.location)}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p>Calculate a recommendation after creating a profile and search preference.</p>
              <MatchButton jobId={job.id} />
            </>
          )}
          <div className="source-links">
            <h3>Apply through source</h3>
            {sources.map((source) => (
              <a
                key={source.applicationUrl}
                href={source.applicationUrl}
                target="_blank"
                rel="noreferrer"
              >
                {source.name}
              </a>
            ))}
            {sources.length === 0 ? (
              <a href={job.canonicalApplicationUrl} target="_blank" rel="noreferrer">
                Original application page
              </a>
            ) : null}
          </div>
          <SaveButton jobId={job.id} initialSaved={saved} />
          <TrackApplicationButton jobId={job.id} />
        </aside>
      </div>
    </main>
  );
}
