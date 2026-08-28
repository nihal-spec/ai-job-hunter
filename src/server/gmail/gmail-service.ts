import { deleteGmailConnection, findGmailConnection, saveGmailConnection } from "@/server/gmail/repository";
import { decryptToken, encryptToken } from "@/server/gmail/crypto";
import { exchangeCode, getGoogleAuthorizationUrl, getGoogleUserInfo, refreshAccessToken, createOAuthState } from "@/server/gmail/gmail-oauth";

export async function getGmailStatus(userId: string) {
  const [connection] = await findGmailConnection(userId);
  return connection ? { connected: true, email: connection.email, scope: connection.scope, connectedAt: connection.connectedAt } : { connected: false };
}

export function createGmailConnectUrl(userId: string) {
  return getGoogleAuthorizationUrl(createOAuthState(userId));
}

export async function completeGmailConnection(userId: string, code: string) {
  const tokens = await exchangeCode(code);
  const info = await getGoogleUserInfo(tokens.access_token);
  const [connection] = await saveGmailConnection(userId, {
    googleAccountId: info.sub,
    email: info.email,
    accessTokenEncrypted: encryptToken(tokens.access_token),
    refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    accessTokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
    scope: tokens.scope ?? "https://www.googleapis.com/auth/gmail.readonly",
    connectedAt: new Date(),
    lastRefreshedAt: null,
  });
  return connection;
}

export async function disconnectGmail(userId: string) {
  const [connection] = await findGmailConnection(userId);
  if (connection) {
    const token = connection.refreshTokenEncrypted ?? connection.accessTokenEncrypted;
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptToken(token))}`, { method: "POST" }).catch(() => undefined);
  }
  await deleteGmailConnection(userId);
}

export { refreshAccessToken };