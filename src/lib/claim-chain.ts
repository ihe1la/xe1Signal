export type ClaimChain = {
  id: string;
  claim: string;
  proof: string;
  impact: string;
  nextStep: string;
  tags: string[];
  findingId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimChainInput = {
  claim: string;
  proof?: string;
  impact?: string;
  nextStep?: string;
  findingId?: string | null;
};

export const CLAIM_CHAIN_STORAGE_KEY = "xe1signal-tools-claim-chains-v1";
export const CLAIM_CHAIN_SIGNAL_DRAFT_KEY = "xe1signal-claim-chain-signal-draft-v1";

export function createClaimChainId() {
  return `c_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Pull #tags from freeform text (lowercase, unique). */
export function extractClaimTags(...parts: string[]) {
  const tags = new Set<string>();
  for (const part of parts) {
    for (const match of part.matchAll(/(^|[\s([{])#([a-zA-Z0-9][\w.-]{0,47})/g)) {
      tags.add(match[2].toLowerCase());
    }
  }
  return [...tags];
}

function cleanField(value: string | undefined) {
  return (value ?? "").replace(/\s+$/g, "").trimStart();
}

export function createClaimChain(input: ClaimChainInput): ClaimChain | null {
  const claim = cleanField(input.claim);
  if (!claim) return null;
  const proof = cleanField(input.proof);
  const impact = cleanField(input.impact);
  const nextStep = cleanField(input.nextStep);
  const now = new Date().toISOString();
  return {
    id: createClaimChainId(),
    claim,
    proof,
    impact,
    nextStep,
    tags: extractClaimTags(claim, proof, impact, nextStep),
    findingId: input.findingId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateClaimChain(chain: ClaimChain, input: ClaimChainInput): ClaimChain {
  const claim = cleanField(input.claim) || chain.claim;
  const proof = cleanField(input.proof);
  const impact = cleanField(input.impact);
  const nextStep = cleanField(input.nextStep);
  return {
    ...chain,
    claim,
    proof,
    impact,
    nextStep,
    tags: extractClaimTags(claim, proof, impact, nextStep),
    findingId: input.findingId === undefined ? chain.findingId : input.findingId,
    updatedAt: new Date().toISOString(),
  };
}

export function formatClaimChainBody(chain: ClaimChain) {
  const sections = [
    ["Claim", chain.claim],
    ["Proof", chain.proof],
    ["Impact", chain.impact],
    ["Next", chain.nextStep],
  ].filter(([, value]) => Boolean(value.trim()));

  return sections.map(([label, value]) => `## ${label}\n${value.trim()}`).join("\n\n");
}

export function formatClaimChainTitle(chain: ClaimChain) {
  const line = chain.claim.replace(/\s+/g, " ").trim();
  if (line.length <= 96) return line;
  return `${line.slice(0, 93).trimEnd()}…`;
}

export function buildSignalDraft(chain: ClaimChain) {
  return {
    title: formatClaimChainTitle(chain),
    description: formatClaimChainBody(chain),
    tags: chain.tags.join(", "),
    source: "claim-chain" as const,
    chainId: chain.id,
  };
}

export function parseClaimChains(raw: string | null): ClaimChain[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ClaimChain => {
        if (!item || typeof item !== "object") return false;
        const chain = item as Partial<ClaimChain>;
        return (
          typeof chain.id === "string" &&
          typeof chain.claim === "string" &&
          typeof chain.proof === "string" &&
          typeof chain.impact === "string" &&
          typeof chain.nextStep === "string" &&
          Array.isArray(chain.tags) &&
          chain.tags.every((tag) => typeof tag === "string") &&
          (chain.findingId === null || typeof chain.findingId === "string") &&
          typeof chain.createdAt === "string" &&
          typeof chain.updatedAt === "string"
        );
      })
      .map((chain) => ({
        ...chain,
        tags: chain.tags.map((tag) => tag.toLowerCase()),
      }));
  } catch {
    return [];
  }
}

export function serializeClaimChains(chains: ClaimChain[]) {
  return JSON.stringify(chains);
}

export function searchClaimChains(chains: ClaimChain[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return chains;
  const tokens = needle.split(/\s+/).filter(Boolean);
  return chains.filter((chain) => {
    const haystack = `${chain.claim}\n${chain.proof}\n${chain.impact}\n${chain.nextStep}\n${chain.tags.join(" ")}`.toLowerCase();
    return tokens.every((token) => {
      if (token.startsWith("#")) return chain.tags.includes(token.slice(1)) || haystack.includes(token);
      return haystack.includes(token);
    });
  });
}

export function sortClaimChainsNewestFirst(chains: ClaimChain[]) {
  return [...chains].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
