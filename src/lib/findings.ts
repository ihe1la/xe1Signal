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

export function extractUrls(body: string) {
  return [...body.matchAll(/https?:\/\/[^\s<>"']+/g)].map((match) => match[0].replace(/[),.;]+$/g, ""));
}
