import { describe, expect, it } from "vitest";
import {
  buildSignalDraft,
  createClaimChain,
  extractClaimTags,
  formatClaimChainBody,
  parseClaimChains,
  searchClaimChains,
  serializeClaimChains,
  updateClaimChain,
} from "@/lib/claim-chain";

describe("claim-chain", () => {
  it("extracts tags across spine fields", () => {
    expect(extractClaimTags("IDOR on /users #idor", "proof #auth", "impact", "next #report")).toEqual([
      "idor",
      "auth",
      "report",
    ]);
  });

  it("creates and updates chains", () => {
    const created = createClaimChain({
      claim: "  /users/{id} leaks other profiles #idor  ",
      proof: "changed id → 200 with foreign email",
      impact: "account takeover path",
      nextStep: "confirm authz matrix",
    });
    expect(created?.claim).toBe("/users/{id} leaks other profiles #idor");
    expect(created?.tags).toEqual(["idor"]);

    const updated = updateClaimChain(created!, {
      claim: created!.claim,
      proof: "retested with two sessions #auth",
      impact: created!.impact,
      nextStep: created!.nextStep,
    });
    expect(updated.proof).toBe("retested with two sessions #auth");
    expect(updated.tags).toEqual(["idor", "auth"]);
  });

  it("formats a signal draft from the spine", () => {
    const chain = createClaimChain({
      claim: "Cached private dashboard #cache",
      proof: "CF-Cache-Status: HIT on /me",
      impact: "cross-user data bleed",
      nextStep: "check Vary + cookies",
    })!;
    const draft = buildSignalDraft(chain);
    expect(draft.title).toContain("Cached private dashboard");
    expect(draft.description).toContain("## Claim");
    expect(draft.description).toContain("## Proof");
    expect(draft.tags).toBe("cache");
    expect(formatClaimChainBody(chain)).toContain("CF-Cache-Status");
  });

  it("searches and round-trips storage", () => {
    const items = [
      createClaimChain({ claim: "open redirect #open-redirect", proof: "//evil" })!,
      createClaimChain({ claim: "missing CSRF #csrf", proof: "state-changing GET" })!,
    ];
    expect(searchClaimChains(items, "#csrf")).toHaveLength(1);
    expect(searchClaimChains(items, "evil")).toHaveLength(1);
    expect(parseClaimChains(serializeClaimChains(items))).toEqual(items);
    expect(parseClaimChains("{")).toEqual([]);
  });
});
