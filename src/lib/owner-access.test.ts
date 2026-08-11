import { describe, expect, it } from "vitest";
import { OWNER_USERNAME, canAccessOwnerTools } from "@/lib/owner-access";

describe("owner-access", () => {
  it("allows only ihe1la", () => {
    expect(OWNER_USERNAME).toBe("ihe1la");
    expect(canAccessOwnerTools("ihe1la")).toBe(true);
    expect(canAccessOwnerTools("IHE1LA")).toBe(true);
    expect(canAccessOwnerTools("hela")).toBe(false);
    expect(canAccessOwnerTools("test")).toBe(false);
    expect(canAccessOwnerTools(null)).toBe(false);
    expect(canAccessOwnerTools(undefined)).toBe(false);
  });
});
