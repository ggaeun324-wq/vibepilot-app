import { describe, expect, it } from "vitest";

import { normalizeEmail, validateLoginInput, validateRegistrationInput } from "./validation";

describe("validation", () => {
  it("normalizes email casing and spacing", () => {
    expect(normalizeEmail("  USER@Example.COM ")).toBe("user@example.com");
  });

  it("rejects invalid login email", () => {
    expect(validateLoginInput("invalid-email", "1234")).toEqual({
      ok: false,
      error: "유효한 이메일을 입력해주세요.",
    });
  });

  it("rejects short passwords", () => {
    expect(validateLoginInput("user@example.com", "123")).toEqual({
      ok: false,
      error: "비밀번호는 4자 이상이어야 합니다.",
    });
  });

  it("requires a display name on registration", () => {
    expect(validateRegistrationInput("user@example.com", "1234", "   ")).toEqual({
      ok: false,
      error: "이름을 입력해주세요.",
    });
  });

  it("returns normalized registration input", () => {
    expect(validateRegistrationInput("USER@example.com", "1234", "  Vibe  ")).toEqual({
      ok: true,
      value: {
        email: "user@example.com",
        password: "1234",
        displayName: "Vibe",
      },
    });
  });
});
