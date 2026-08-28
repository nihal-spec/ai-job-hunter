import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/server/auth/session";

export default async function SignInPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <section className="auth-card" aria-labelledby="sign-in-title">
      <p className="eyebrow">Welcome back</p>
      <h1 id="sign-in-title">Sign in</h1>
      <p className="auth-intro">Continue to your private job-search workspace.</p>
      <AuthForm mode="sign-in" />
    </section>
  );
}
