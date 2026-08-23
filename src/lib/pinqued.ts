export const PINQUED_PUBLIC_ORIGIN =
  process.env.NEXT_PUBLIC_PINQUED_PUBLIC_ORIGIN || "https://01x.site";

export type JsonRecord = Record<string, unknown>;

export type PinquedSnippet = {
  id: string;
  name: string;
  comment: string;
  content: string;
  isExecutable: boolean;
  isBookmarked: boolean;
  inCollection?: boolean;
  authorUsername?: string;
  sourceSnippetId?: string | null;
};

export type PinquedFileEntry = {
  name: string;
  path: string;
  kind: "file" | "dir";
  size: number | null;
  modifiedAt: string | null;
};

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value) || fallback;
}

export function pinquedError(value: unknown, fallback: string) {
  const record = asRecord(value);
  const error = record.error;
  if (typeof error === "string" && error.trim()) return error;
  const nested = asRecord(error);
  const message = asText(nested.message);
  if (!message) return fallback;
  if (nested.code === "insufficient_scope") {
    return `${message}. Enable that permission on the Pinqued API key (Settings → API Keys).`;
  }
  return message;
}

export function normalizeSnippet(value: unknown): PinquedSnippet | null {
  const raw = asRecord(value);
  const id = asText(raw.id);
  if (!id) return null;
  return {
    id,
    name: asText(raw.name) || "untitled",
    comment: asText(raw.comment),
    content: asText(raw.content),
    isExecutable: Boolean(raw.isExecutable),
    isBookmarked: Boolean(raw.isBookmarked),
    inCollection: raw.inCollection === undefined ? undefined : Boolean(raw.inCollection),
    authorUsername: asText(raw.authorUsername) || undefined,
    sourceSnippetId: asText(raw.sourceSnippetId) || null,
  };
}

export function publicStashUrl(path: string, id: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const publicPath = path.startsWith("/") ? path : `/a/${id}`;
  return `${PINQUED_PUBLIC_ORIGIN}${publicPath}`;
}

function joinPath(base: string, name: string) {
  if (!base || base === "/") return `/${name}`.replace(/\/+/g, "/");
  return `${base.replace(/\/+$/, "")}/${name}`;
}

export function normalizeFileEntry(value: unknown, parentPath: string): PinquedFileEntry | null {
  const raw = asRecord(value);
  const name = asText(raw.name) || asText(raw.filename) || asText(raw.basename);
  if (!name || name === "." || name === "..") return null;
  const explicitPath = asText(raw.path) || asText(raw.fullPath) || asText(raw.full_path);
  const kindRaw = asText(raw.type) || asText(raw.kind) || asText(raw.mode);
  const isDir =
    raw.isDirectory === true ||
    raw.isDir === true ||
    raw.directory === true ||
    kindRaw === "dir" ||
    kindRaw === "directory" ||
    kindRaw === "folder";
  return {
    name,
    path: explicitPath || joinPath(parentPath, name),
    kind: isDir ? "dir" : "file",
    size: raw.size == null ? null : asNumber(raw.size, 0),
    modifiedAt:
      asText(raw.modifiedAt) ||
      asText(raw.mtime) ||
      asText(raw.updatedAt) ||
      asText(raw.updated_at) ||
      null,
  };
}

export function normalizeFileList(payload: unknown, parentPath: string) {
  const record = asRecord(payload);
  const data = record.data;
  const source = Array.isArray(data)
    ? data
    : Array.isArray(asRecord(data).entries)
      ? (asRecord(data).entries as unknown[])
      : Array.isArray(asRecord(data).files)
        ? (asRecord(data).files as unknown[])
        : Array.isArray(asRecord(data).items)
          ? (asRecord(data).items as unknown[])
          : Array.isArray(record.entries)
            ? (record.entries as unknown[])
            : Array.isArray(record.files)
              ? (record.files as unknown[])
              : [];
  const currentPath =
    asText(asRecord(data).path) || asText(record.path) || parentPath || "/";
  return {
    path: currentPath.startsWith("/") ? currentPath : `/${currentPath}`,
    entries: source.map((entry) => normalizeFileEntry(entry, currentPath)).filter((entry): entry is PinquedFileEntry => Boolean(entry)),
  };
}

export function parentPath(path: string) {
  const clean = path.replace(/\/+$/, "") || "/";
  const idx = clean.lastIndexOf("/");
  if (idx <= 0) return "/";
  return clean.slice(0, idx) || "/";
}
