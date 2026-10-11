import { EmailProviderError, type EmailProvider } from "@/server/email/contracts";

/** Resend's API is a single JSON POST, so this uses raw `fetch` rather than adding their SDK as a dependency. */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(input: { to: string; subject: string; text: string; html?: string }) {
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    if (!response.ok) {
      throw new EmailProviderError(`Resend returned HTTP ${response.status}.`);
    }
  }
}
