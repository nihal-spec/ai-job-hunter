import { env } from "@/env";
import type { EmailProvider } from "@/server/email/contracts";
import { ResendEmailProvider } from "@/server/email/providers/resend";

let provider: EmailProvider | null | undefined;

/** Returns null when no email provider is configured; callers must handle the "can't send" case explicitly rather than throwing. */
export function getEmailProvider(): EmailProvider | null {
  if (provider === undefined) {
    provider =
      env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM
        ? new ResendEmailProvider(env.EMAIL_PROVIDER_API_KEY, env.EMAIL_FROM)
        : null;
  }
  return provider;
}
