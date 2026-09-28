import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { env } from "@/env";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getEmailProvider } from "@/server/email";

/** No-ops with a warning when no email provider is configured, instead of breaking signup/reset in dev. */
async function sendAuthEmail(to: string, subject: string, text: string) {
  const provider = getEmailProvider();
  if (!provider) {
    console.warn(`Email provider not configured; skipping "${subject}" email to a user.`);
    return;
  }
  await provider.send({ to, subject, text });
}

const emailProviderConfigured = Boolean(env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM);

export const auth = betterAuth({
  appName: "AI Job Hunter",
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // Only require verification once an email provider is actually configured, so local/dev
    // environments without EMAIL_PROVIDER_API_KEY don't lock users out of their own accounts.
    requireEmailVerification: emailProviderConfigured,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail(
        user.email,
        "Reset your AI Job Hunter password",
        `Reset your password: ${url}\n\nIf you didn't request this, you can ignore this email.`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: emailProviderConfigured,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail(
        user.email,
        "Verify your AI Job Hunter email",
        `Verify your email: ${url}`,
      );
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    database: {
      generateId: "uuid",
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
});
