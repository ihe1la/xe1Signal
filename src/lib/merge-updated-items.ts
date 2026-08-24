export type UpdatedItem = {
  id: string;
  updatedAt: string;
};

export function mergeUpdatedItems<T extends UpdatedItem>(...collections: T[][]) {
  const merged = new Map<string, T>();
  for (const collection of collections) {
    for (const item of collection) {
      const current = merged.get(item.id);
      if (!current || timestamp(item.updatedAt) >= timestamp(current.updatedAt)) {
        merged.set(item.id, item);
      }
    }
  }
  return [...merged.values()];
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
