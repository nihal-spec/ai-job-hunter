import { ResumeManager } from "@/components/resumes/resume-manager";
import { ProfileEditor } from "@/components/profiles/profile-editor";
import { PreferenceManager } from "@/components/preferences/preference-manager";
import { GmailConnection } from "@/components/gmail/gmail-connection";
import { analyticsDateRange } from "@/server/analytics/contracts";
import { getDashboardAnalytics } from "@/server/analytics/service";
import { requireSession } from "@/server/auth/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const parsedRange = analyticsDateRange.safeParse({ from: params.from, to: params.to });
  const range = parsedRange.success && (!parsedRange.data.from || !parsedRange.data.to || parsedRange.data.from < parsedRange.data.to) ? parsedRange.data : {};
  const analytics = await getDashboardAnalytics(session.user.id, range);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h1>Welcome, {session.user.name}</h1>
        </div>
      </header>
      <section className="analytics-panel" aria-labelledby="analytics-heading">
        <div className="analytics-heading">
          <div>
            <p className="eyebrow">Your funnel</p>
            <h2 id="analytics-heading">Job search signals</h2>
          </div>
          <p className="analytics-note">Distinct jobs across your workspace</p>
        </div>
        <form className="analytics-filters" method="get">
          <label>
            From
            <input type="date" name="from" defaultValue={params.from} />
          </label>
          <label>
            To
            <input type="date" name="to" defaultValue={params.to} />
          </label>
          <button type="submit">Apply range</button>
          <a href="/dashboard">Clear</a>
        </form>
        <div className="analytics-grid">
          {Object.entries(analytics.counts).map(([label, value]) => (
            <div className="analytics-metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="analytics-rates" aria-label="Funnel conversion rates">
          <span>Match {analytics.rates.matchRate === null ? "-" : `${analytics.rates.matchRate}%`}</span>
          <span>Save {analytics.rates.saveRate === null ? "-" : `${analytics.rates.saveRate}%`}</span>
          <span>Apply {analytics.rates.applicationRate === null ? "-" : `${analytics.rates.applicationRate}%`}</span>
          <span>Interview {analytics.rates.interviewRate === null ? "-" : `${analytics.rates.interviewRate}%`}</span>
          <span>Offer {analytics.rates.offerRate === null ? "-" : `${analytics.rates.offerRate}%`}</span>
        </div>
      </section>
      <ResumeManager />
      <ProfileEditor />
      <PreferenceManager />
      <GmailConnection />
    </main>
  );
}
