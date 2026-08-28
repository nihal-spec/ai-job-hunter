import { env } from "@/env";
import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">AI Job Hunter</p>
        <h1 id="page-title">A calmer way to move your job search forward.</h1>
        <p className="lede">
          Your workspace for discovering relevant roles, understanding the fit, and keeping every
          application organized.
        </p>
        <div className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          Foundation ready
        </div>
        <div className="landing-actions">
          <Link className="primary-action" href="/sign-up">
            Create your account
          </Link>
          <Link className="secondary-action" href="/sign-in">
            Sign in
          </Link>
        </div>
      </section>
      <footer className="footer">
        <span>Built for deliberate, user-controlled applications.</span>
        <span>{new URL(env.APP_URL).hostname}</span>
      </footer>
    </main>
  );
}
