import { describe, expect, it } from "vitest";
import { canAccessScenarioLab, compareAccess, compileSafeRegex, simulateFilter, simulateOAuth } from "./scenario-lab";
const base = { id: "1", name: "rule", pattern: "bad", matchType: "CONTAINS" as const, action: "BLOCK" as const, replacement: "", enabled: true, order: 0 };
describe("Scenario Lab access", () => { it("requires both the flag and ihe1la", () => { expect(canAccessScenarioLab(true, "ihe1la")).toBe(true); expect(canAccessScenarioLab(false, "ihe1la")).toBe(false); expect(canAccessScenarioLab(true, "hela")).toBe(false); }); });
describe("filter simulation", () => {
  it("runs rules in order", () => { const rules = [{ ...base, name: "second", action: "ALLOW" as const, order: 2 }, { ...base, name: "first", action: "BLOCK" as const, order: 1 }]; expect(simulateFilter("bad", rules, "Plain text").matchedRule).toBe("first"); });
  it("supports contains and insensitive matching", () => { expect(simulateFilter("bad", [base], "Plain text").result).toBe("Blocked"); expect(simulateFilter("BAD", [{ ...base, matchType: "CONTAINS_INSENSITIVE" }], "Plain text").result).toBe("Blocked"); });
  it("supports safe regex and rejects invalid or risky expressions", () => { expect(simulateFilter("onclick", [{ ...base, pattern: "onerror|onclick", matchType: "REGEX" }], "Plain text").result).toBe("Blocked"); expect(() => compileSafeRegex("[")).toThrow(/Invalid/); expect(() => compileSafeRegex("(a+)+")).toThrow(/disabled/); });
  it.each([["REMOVE", "Removed", ""], ["ENCODE", "Encoded", "&lt;"], ["REPLACE", "Modified", "safe"]] as const)("applies %s", (action, result, output) => { const pattern = action === "ENCODE" ? "<" : "bad"; expect(simulateFilter(action === "ENCODE" ? "<" : "bad", [{ ...base, pattern, action, replacement: "safe" }], "HTML text")).toMatchObject({ result, output }); });
  it("escapes reflection output", () => { expect(simulateFilter("<b>", [], "HTML text").snippet).toContain("&lt;div&gt;"); });
});
describe("OAuth", () => { it.each(["valid", "missing-state", "modified-state", "incorrect-verifier", "different-redirect", "reused-code", "expired-code"] as const)("handles %s", (scenario) => expect(simulateOAuth(scenario).passed).toBe(true)); });
describe("access matrix", () => { it("detects mismatches", () => expect(compareAccess(false, true).classification).toBe("Possible access-control mismatch")); });
