import { describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "@/server/gmail/crypto";
import { createOAuthState, verifyOAuthState } from "@/server/gmail/gmail-oauth";

describe("Gmail security primitives", () => {
  it("encrypts tokens and rejects tampered ciphertext", () => {
    const encrypted = encryptToken("refresh-token");
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptToken(encrypted)).toBe("refresh-token");
    expect(() => decryptToken(`${encrypted}x`)).toThrow();
  });

  it("rejects a tampered OAuth state", () => {
    const state = createOAuthState("00000000-0000-0000-0000-000000000001");
    expect(verifyOAuthState(state)).toBe("00000000-0000-0000-0000-000000000001");
    expect(() => verifyOAuthState(`${state}x`)).toThrow("INVALID_OAUTH_STATE");
  });
});