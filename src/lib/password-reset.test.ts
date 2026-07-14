import { describe, expect, it } from "vitest";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
} from "./password-reset";

describe("password reset tokens", () => {
  it("creates a random token and stores only its SHA-256 hash", () => {
    const first = createPasswordResetToken();
    const second = createPasswordResetToken();

    expect(first.token).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).toBe(hashPasswordResetToken(first.token));
    expect(first.tokenHash).not.toBe(first.token);
    expect(second.token).not.toBe(first.token);
  });

  it("hashes a token deterministically", () => {
    expect(hashPasswordResetToken("signal-archive")).toBe(
      "a837864bf5cde2f662823a30b9eaaf8d487e780cc0e45cf05ed68b3423af0241",
    );
  });
});
