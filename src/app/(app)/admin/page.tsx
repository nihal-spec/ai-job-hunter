import { Badge } from "@/components/ui/card";
import { AdminUserRowActions } from "@/components/admin/admin-user-row-actions";
import { AdminRetryButton } from "@/components/admin/admin-retry-button";
import { getAdminDashboard } from "@/server/admin/service";
import { requireAdmin } from "@/server/auth/session";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="m-0 mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <Badge tone={ok ? "accent" : "danger"}>{ok ? "OK" : "Not configured"}</Badge>
    </div>
  );
}

export default async function AdminPage() {
  await requireAdmin();
  const { overview, gmailOutreach, processingJobs, users, systemHealth, aiUsage } = await getAdminDashboard();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="m-0 text-3xl font-semibold text-ink">Admin</h1>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Users" value={overview.users} />
        <StatCard label="Jobs" value={overview.jobs} />
        <StatCard label="Applications" value={overview.applications} />
        <StatCard label="Queued jobs" value={overview.pendingProcessingJobs} />
        <StatCard label="Failed jobs" value={overview.failedProcessingJobs} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-ink">System health</h2>
          <div className="mt-2 rounded-xl border border-line bg-surface p-4">
            <HealthRow label="Database" ok={systemHealth.database} />
            <HealthRow label="AI provider" ok={systemHealth.aiProvider} />
            <HealthRow label="Object storage (production-ready)" ok={systemHealth.storage} />
            <HealthRow label="Gmail OAuth configured" ok={systemHealth.gmail} />
            <HealthRow label="Job sources enabled" ok={systemHealth.jobSources} />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-ink">Gmail &amp; outreach</h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <StatCard label="Gmail connections" value={gmailOutreach.gmailConnections} />
            <StatCard label="Classified emails" value={gmailOutreach.classifiedEmails} />
            <StatCard label="Pending confirmations" value={gmailOutreach.pendingEmailMatches} />
            <StatCard label="Outreach sent" value={gmailOutreach.outreachSent} />
          </div>
          <p className="mt-2 text-xs text-muted">Counts only — mailbox content is never shown here.</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">AI usage</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {aiUsage.length === 0 ? (
            <p className="text-sm text-muted">No AI operations recorded yet.</p>
          ) : (
            aiUsage.map((row) => <StatCard key={row.scope} label={row.scope.replaceAll("_", " ")} value={row.totalCalls} />)
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">Processing jobs</h2>
        <ul className="mt-2 grid gap-2">
          {processingJobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
              <div>
                <span className="font-semibold text-ink">{job.type}</span>{" "}
                <Badge tone={job.status === "failed" ? "danger" : job.status === "completed" ? "accent" : "neutral"}>{job.status}</Badge>
                {job.lastErrorCode ? <span className="ml-2 text-muted">{job.lastErrorCode}</span> : null}
              </div>
              {job.status === "failed" ? <AdminRetryButton jobId={job.id} /> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">Users</h2>
        <ul className="mt-2 grid gap-2">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
              <div>
                <p className="m-0 font-semibold text-ink">{user.name} · {user.email}</p>
                <p className="m-0 text-muted">
                  {user.resumeCount} resumes · {user.applicationCount} applications · {user.gmailConnected ? "Gmail connected" : "No Gmail"}
                </p>
              </div>
              <AdminUserRowActions userId={user.id} disabled={Boolean(user.disabledAt)} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
