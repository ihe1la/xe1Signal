import { describe, expect, it } from "vitest";
import { issueTerminalTicket, verifyTerminalTicket } from "@/lib/terminal-ticket";

describe("terminal-ticket", () => {
  it("issues and verifies owner tickets", () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-terminal";
    const ticket = issueTerminalTicket("ihe1la");
    expect(verifyTerminalTicket(ticket)?.u).toBe("ihe1la");
  });

  it("rejects non-owner, expired, and tampered tickets", () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-terminal";
    expect(() => issueTerminalTicket("other")).toThrow(/owner-only/i);
    const expired = issueTerminalTicket("ihe1la", Date.now() - 3 * 60 * 1000);
    expect(verifyTerminalTicket(expired)).toBeNull();
    const ticket = issueTerminalTicket("ihe1la");
    expect(verifyTerminalTicket(`${ticket.slice(0, -2)}aa`)).toBeNull();
  });
});
