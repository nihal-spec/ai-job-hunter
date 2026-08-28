import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/env";
import type { GoogleTokenResponse, GoogleUserInfo } from "@/server/gmail/types";

const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];
const stateLifetimeMs = 10 * 60 * 1000;

function requireConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("GMAIL_NOT_CONFIGURED");
}

export function createOAuthState(userId: string) {
  const payload = `${userId}.${Date.now()}.${randomBytes(18).toString("base64url")}`;
  const signature = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function verifyOAuthState(state: string) {
  const [payloadValue, signatureValue] = state.split(".");
  if (!payloadValue || !signatureValue) throw new Error("INVALID_OAUTH_STATE");
  const payload = Buffer.from(payloadValue, "base64url").toString("utf8");
  const expected = createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
  if (signatureValue.length !== expected.length || !timingSafeEqual(Buffer.from(signatureValue), Buffer.from(expected))) throw new Error("INVALID_OAUTH_STATE");
  const [userId, issuedAt] = payload.split(".");
  if (!userId || !issuedAt || Date.now() - Number(issuedAt) > stateLifetimeMs) throw new Error("EXPIRED_OAUTH_STATE");
  return userId;
}

export function getGoogleAuthorizationUrl(state: string) {
  requireConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, redirect_uri: env.GMAIL_REDIRECT_URI, response_type: "code", access_type: "offline", prompt: "consent", scope: scopes.join(" "), state }).toString();
  return url.toString();
}

async function googleRequest<T>(url: string, body: URLSearchParams) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error("GOOGLE_OAUTH_REQUEST_FAILED");
  return (await response.json()) as T;
}

export function exchangeCode(code: string) {
  requireConfig();
  return googleRequest<GoogleTokenResponse>("https://oauth2.googleapis.com/token", new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: env.GMAIL_REDIRECT_URI, grant_type: "authorization_code" }));
}

export function refreshAccessToken(refreshToken: string) {
  requireConfig();
  return googleRequest<GoogleTokenResponse>("https://oauth2.googleapis.com/token", new URLSearchParams({ refresh_token: refreshToken, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, grant_type: "refresh_token" }));
}

export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("GOOGLE_USERINFO_REQUEST_FAILED");
  return (await response.json()) as GoogleUserInfo;
}

export const gmailScopes = scopes;