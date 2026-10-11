import { decryptToken, encryptToken } from "@/server/gmail/crypto";
import { refreshAccessToken } from "@/server/gmail/gmail-oauth";
import { findGmailConnection, saveGmailConnection } from "@/server/gmail/repository";

export class GmailNotConnectedError extends Error {}
export class GmailRequestError extends Error {}

/** Returns a valid access token for the user's connected Gmail account, refreshing and re-persisting it first if expired. */
export async function getValidAccessToken(userId: string): Promise<string> {
  const [connection] = await findGmailConnection(userId);
  if (!connection) throw new GmailNotConnectedError("Gmail is not connected for this user.");

  const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0;
  if (expiresAt > Date.now() + 60_000) {
    return decryptToken(connection.accessTokenEncrypted);
  }

  if (!connection.refreshTokenEncrypted) {
    throw new GmailNotConnectedError("Gmail access token expired and no refresh token is stored.");
  }

  const refreshed = await refreshAccessToken(decryptToken(connection.refreshTokenEncrypted));
  await saveGmailConnection(userId, {
    googleAccountId: connection.googleAccountId,
    email: connection.email,
    accessTokenEncrypted: encryptToken(refreshed.access_token),
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
    accessTokenExpiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
    scope: connection.scope,
    connectedAt: connection.connectedAt,
    lastRefreshedAt: new Date(),
  });
  return refreshed.access_token;
}

async function gmailApiRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: { ...init?.headers, authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new GmailRequestError(`Gmail API returned HTTP ${response.status} for ${path}.`);
  }
  return (await response.json()) as T;
}

/** Gmail's search query, scoped to plausible job-related mail rather than the whole mailbox (see PROJECT_SPEC.md §18). */
const JOB_RELATED_QUERY =
  'newer_than:14d (subject:(application OR interview OR assessment OR offer OR rejected OR "thank you for applying" OR recruiter) OR from:(noreply OR careers OR talent OR recruiting OR jobs))';

export async function listRecentJobRelatedMessageIds(accessToken: string, pageToken?: string) {
  const params = new URLSearchParams({ q: JOB_RELATED_QUERY, maxResults: "25" });
  if (pageToken) params.set("pageToken", pageToken);
  const data = await gmailApiRequest<{
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
  }>(accessToken, `/messages?${params.toString()}`);
  return { messages: data.messages ?? [], nextPageToken: data.nextPageToken };
}

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: { name: string; value: string }[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
  internalDate?: string;
};

function decodeBase64Url(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractPlainText(part: GmailMessagePart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const text = extractPlainText(child);
    if (text) return text;
  }
  return "";
}

export type NormalizedGmailMessage = {
  providerMessageId: string;
  gmailThreadId: string;
  sender: string;
  recipient: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: Date;
};

export async function getMessage(accessToken: string, messageId: string): Promise<NormalizedGmailMessage> {
  const message = await gmailApiRequest<GmailMessage>(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}?format=full`,
  );
  const headers = message.payload?.headers ?? [];
  const header = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

  return {
    providerMessageId: message.id,
    gmailThreadId: message.threadId,
    sender: header("From") ?? "unknown",
    recipient: header("To"),
    subject: header("Subject"),
    snippet: message.snippet ?? null,
    bodyText: extractPlainText(message.payload as GmailMessagePart).slice(0, 20_000) || null,
    receivedAt: message.internalDate ? new Date(Number(message.internalDate)) : new Date(),
  };
}

function encodeMimeMessage(input: { to: string; subject: string; body: string }) {
  const message = [`To: ${input.to}`, `Subject: ${input.subject}`, "Content-Type: text/plain; charset=UTF-8", "", input.body].join(
    "\r\n",
  );
  return Buffer.from(message, "utf8").toString("base64url");
}

export async function sendMessage(accessToken: string, input: { to: string; subject: string; body: string }) {
  const data = await gmailApiRequest<{ id: string }>(accessToken, "/messages/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw: encodeMimeMessage(input) }),
  });
  return data.id;
}
