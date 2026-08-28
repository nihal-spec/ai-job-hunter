import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/server/auth/session";

export default async function SignUpPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <section className="auth-card" aria-labelledby="sign-up-title">
      <p className="eyebrow">Start deliberately</p>
      <h1 id="sign-up-title">Create your account</h1>
      <p className="auth-intro">Your resume and application data stay private to your account.</p>
      <AuthForm mode="sign-up" />
    </section>
  );
}
