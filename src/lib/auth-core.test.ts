import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  getSessionExpiryDate,
  hashSessionToken,
  verifyLegacyPassword,
} from "./auth-core";
import { simpleHash } from "./legacy-auth";

describe("auth-core", () => {
  it("verifies legacy password hashes", () => {
    const password = "1234";
    expect(verifyLegacyPassword(password, simpleHash(password))).toBe(true);
    expect(verifyLegacyPassword("wrong", simpleHash(password))).toBe(false);
  });

  it("creates stable token hashes", () => {
    const token = createSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it("sets session expiry in the future", () => {
    expect(getSessionExpiryDate().getTime()).toBeGreaterThan(Date.now());
  });
});
