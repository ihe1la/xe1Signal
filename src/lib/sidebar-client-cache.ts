export type SidebarSnapshot = {
  profile: { username: string; name: string; avatarUrl: string | null; strength: number } | null;
  frequencies: { id: string; name: string; signalCount: number }[];
  activeFrequency: { id: string; name: string; signalCount: number } | null;
  recentSignal: { id: string; title: string | null; previewImageUrl: string | null; createdAt: string } | null;
  recentTrail: { id: string; title: string; nodeCount: number; nodes: { id: string; title: string | null }[] } | null;
};

const CACHE_TTL_MS = 20_000;
let cached: SidebarSnapshot | null = null;
let cachedAt = 0;
let pending: Promise<SidebarSnapshot | null> | null = null;

export function loadSidebarSnapshot() {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return Promise.resolve(cached);
  if (pending) return pending;

  pending = fetch("/api/sidebar")
    .then((response) => (response.ok ? response.json() as Promise<SidebarSnapshot> : null))
    .then((snapshot) => {
      if (snapshot) {
        cached = snapshot;
        cachedAt = Date.now();
      }
      return snapshot;
    })
    .catch(() => null)
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function invalidateSidebarSnapshot() {
  cached = null;
  cachedAt = 0;
}
