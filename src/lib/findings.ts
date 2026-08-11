export type Finding = {
  id: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export const FINDINGS_STORAGE_KEY = "xe1signal-tools-findings-v1";

export function createFindingId() {
  return `f_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Pull #tags from freeform text (lowercase, unique). */
export function extractTags(body: string) {
  const tags = new Set<string>();
  for (const match of body.matchAll(/(^|[\s([{])#([a-zA-Z0-9][\w.-]{0,47})/g)) {
    tags.add(match[2].toLowerCase());
  }
  return [...tags];
}

export function createFinding(
  body: string,
  options?: { id?: string; createdAt?: string; updatedAt?: string },
): Finding | null {
  const trimmed = body.replace(/\s+$/g, "").trimStart();
  if (!trimmed) return null;
  const now = new Date().toISOString();
  return {
    id: options?.id || createFindingId(),
    body: trimmed,
    tags: extractTags(trimmed),
    createdAt: options?.createdAt || now,
    updatedAt: options?.updatedAt || options?.createdAt || now,
  };
}

export function updateFinding(finding: Finding, body: string): Finding {
  const trimmed = body.replace(/\s+$/g, "").trimStart();
  return {
    ...finding,
    body: trimmed,
    tags: extractTags(trimmed),
    updatedAt: new Date().toISOString(),
  };
}

export function parseFindings(raw: string | null): Finding[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Finding => {
        if (!item || typeof item !== "object") return false;
        const finding = item as Partial<Finding>;
        return (
          typeof finding.id === "string" &&
          typeof finding.body === "string" &&
          Array.isArray(finding.tags) &&
          finding.tags.every((tag) => typeof tag === "string") &&
          typeof finding.createdAt === "string" &&
          typeof finding.updatedAt === "string"
        );
      })
      .map((finding) => ({
        ...finding,
        tags: finding.tags.map((tag) => tag.toLowerCase()),
      }));
  } catch {
    return [];
  }
}

export function serializeFindings(findings: Finding[]) {
  return JSON.stringify(findings);
}

export function searchFindings(findings: Finding[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return findings;

  const tokens = needle.split(/\s+/).filter(Boolean);
  return findings.filter((finding) => {
    const haystack = `${finding.body}\n${finding.tags.join(" ")}`.toLowerCase();
    return tokens.every((token) => {
      if (token.startsWith("#")) return finding.tags.includes(token.slice(1)) || haystack.includes(token);
      return haystack.includes(token);
    });
  });
}

export function sortFindingsNewestFirst(findings: Finding[]) {
  return [...findings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function collectFindingTags(findings: Finding[]) {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    for (const tag of finding.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

/** Sample recon notes from linktr.ee/ihe1la (same sample used in the old Targets map). */
export function createLinktreeSeedFindings(): Finding[] {
  const stamp = "2026-08-11T12:00:00.000Z";
  const rows: Array<[string, string]> = [
    [
      "seed_lt_profile",
      "Profile hub: https://linktr.ee/ihe1la · bio “it3xe1l” #linktree #profile #ihe1la",
    ],
    [
      "seed_lt_instagram_icon",
      "Social icon → Instagram https://instagram.com/it3hela #linktree #social #instagram",
    ],
    [
      "seed_lt_instagram_block",
      "Link block → Instagram https://www.instagram.com/selfdesuv #linktree #social #instagram",
    ],
    [
      "seed_lt_threads",
      "Social → Threads https://www.threads.com/it3helt #linktree #social #threads",
    ],
    [
      "seed_lt_youtube",
      "Social → YouTube https://www.youtube.com/channel/UCXh5H8tGa4TsaNAWgik4ihQ #linktree #social #youtube",
    ],
    [
      "seed_lt_l30on",
      "Destination button “l30on.top” → https://l30on.top/k/cors #linktree #destination #cors",
    ],
    [
      "seed_lt_ato",
      "Destination “ATO PROOF LINK” → https://example.com/ul-001-ato #linktree #destination #ato",
    ],
    [
      "seed_lt_bbclassic",
      "Destination “bbclassic” → https://example.com/bbclassic #linktree #destination",
    ],
    [
      "seed_lt_pinterest",
      "Destination → Pinterest https://de.pinterest.com/helmelme #linktree #social #pinterest",
    ],
    [
      "seed_lt_booking",
      "Booking CTA: “Book a session with me” on the Linktree #linktree #booking",
    ],
    [
      "seed_lt_threat",
      "Threat notes for this Linktree: outbound redirects, social embeds, booking deep-links — what can a visitor control? #linktree #recon #threat",
    ],
  ];

  return rows
    .map(([id, body], index) => {
      const createdAt = new Date(Date.parse(stamp) - index * 60_000).toISOString();
      return createFinding(body, { id, createdAt, updatedAt: createdAt })!;
    })
    .filter(Boolean);
}

/** Insert missing seed findings by stable id (does not overwrite user edits). */
export function mergeSeedFindings(existing: Finding[], seeds: Finding[]) {
  const have = new Set(existing.map((item) => item.id));
  const missing = seeds.filter((seed) => !have.has(seed.id));
  if (!missing.length) return existing;
  return sortFindingsNewestFirst([...missing, ...existing]);
}

export function extractUrls(body: string) {
  return [...body.matchAll(/https?:\/\/[^\s<>"']+/g)].map((match) => match[0].replace(/[),.;]+$/g, ""));
}
