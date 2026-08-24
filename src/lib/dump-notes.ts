export type DumpNote = {
  id: string;
  title: string;
  body: string;
  sourceUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type DumpNotesSettings = {
  vaultName: string;
  folder: string;
};

export const DUMP_NOTES_STORAGE_KEY = "xe1signal-tools-dump-notes-v1";
export const DUMP_NOTES_SETTINGS_KEY = "xe1signal-tools-dump-notes-settings-v1";

export const DEFAULT_DUMP_NOTES_SETTINGS: DumpNotesSettings = {
  vaultName: "",
  folder: "xe1Signal/Dump",
};

export function createDumpNoteId() {
  return `dn_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function extractDumpTags(body: string) {
  const tags = new Set<string>();
  for (const match of body.matchAll(/(^|[\s([{])#([a-zA-Z0-9][\w.-]{0,47})/g)) {
    tags.add(match[2].toLowerCase());
  }
  return [...tags];
}

export function titleFromBody(body: string) {
  const line = body
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find(Boolean);
  if (!line) return "Untitled note";
  const cleaned = line.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= 72) return cleaned || "Untitled note";
  return `${cleaned.slice(0, 69).trimEnd()}…`;
}

export function slugifyNoteTitle(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return base || "Untitled note";
}

export function createDumpNote(
  input: { title?: string; body: string; sourceUrl?: string },
  options?: { id?: string; createdAt?: string; updatedAt?: string },
): DumpNote | null {
  const body = input.body.replace(/\s+$/g, "").trimStart();
  if (!body) return null;
  const title = (input.title || titleFromBody(body)).trim() || titleFromBody(body);
  const sourceUrl = input.sourceUrl?.trim() || undefined;
  const now = new Date().toISOString();
  return {
    id: options?.id || createDumpNoteId(),
    title,
    body,
    sourceUrl,
    tags: extractDumpTags(`${title}\n${body}`),
    createdAt: options?.createdAt || now,
    updatedAt: options?.updatedAt || options?.createdAt || now,
  };
}

export function updateDumpNote(
  note: DumpNote,
  patch: { title?: string; body?: string; sourceUrl?: string | null },
): DumpNote {
  const title = (patch.title ?? note.title).trim() || titleFromBody(patch.body ?? note.body);
  const body = (patch.body ?? note.body).replace(/\s+$/g, "").trimStart();
  const sourceUrl =
    patch.sourceUrl === null ? undefined : (patch.sourceUrl ?? note.sourceUrl)?.trim() || undefined;
  return {
    ...note,
    title,
    body,
    sourceUrl,
    tags: extractDumpTags(`${title}\n${body}`),
    updatedAt: new Date().toISOString(),
  };
}

export function parseDumpNotes(raw: string | null): DumpNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is DumpNote => {
        if (!item || typeof item !== "object") return false;
        const note = item as Partial<DumpNote>;
        return (
          typeof note.id === "string" &&
          typeof note.title === "string" &&
          typeof note.body === "string" &&
          Array.isArray(note.tags) &&
          note.tags.every((tag) => typeof tag === "string") &&
          typeof note.createdAt === "string" &&
          typeof note.updatedAt === "string" &&
          (note.sourceUrl === undefined || typeof note.sourceUrl === "string")
        );
      })
      .map((note) => ({
        ...note,
        tags: note.tags.map((tag) => tag.toLowerCase()),
        sourceUrl: note.sourceUrl?.trim() || undefined,
      }));
  } catch {
    return [];
  }
}

export function serializeDumpNotes(notes: DumpNote[]) {
  return JSON.stringify(notes);
}

function normalizeVaultName(value: unknown) {
  if (typeof value !== "string") return "";
  const name = value.trim();
  return name.toLowerCase() === "vault" ? "" : name;
}

export function hasConfiguredDumpNotesVault(settings: DumpNotesSettings) {
  return normalizeVaultName(settings.vaultName).length > 0;
}

export function parseDumpNotesSettings(raw: string | null): DumpNotesSettings {
  if (!raw) return { ...DEFAULT_DUMP_NOTES_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<DumpNotesSettings>;
    return {
      vaultName: normalizeVaultName(parsed.vaultName),
      folder:
        typeof parsed.folder === "string" && parsed.folder.trim()
          ? parsed.folder.trim().replace(/^\/+|\/+$/g, "")
          : DEFAULT_DUMP_NOTES_SETTINGS.folder,
    };
  } catch {
    return { ...DEFAULT_DUMP_NOTES_SETTINGS };
  }
}

export function serializeDumpNotesSettings(settings: DumpNotesSettings) {
  return JSON.stringify({
    vaultName: normalizeVaultName(settings.vaultName),
    folder: settings.folder.trim().replace(/^\/+|\/+$/g, "") || DEFAULT_DUMP_NOTES_SETTINGS.folder,
  });
}

export function sortDumpNotesNewestFirst(notes: DumpNote[]) {
  return [...notes].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function searchDumpNotes(notes: DumpNote[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((note) => {
    const haystack = `${note.title}\n${note.body}\n${note.sourceUrl || ""}\n${note.tags.join(" ")}`.toLowerCase();
    return q.split(/\s+/).every((token) => haystack.includes(token.replace(/^#/, "")));
  });
}

export function noteVaultPath(note: DumpNote, folder: string) {
  const safeFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  const file = slugifyNoteTitle(note.title);
  return safeFolder ? `${safeFolder}/${file}` : file;
}

export function noteWikiLink(note: DumpNote, folder: string) {
  return `[[${noteVaultPath(note, folder)}]]`;
}

export function formatDumpNoteMarkdown(note: DumpNote, settings: DumpNotesSettings) {
  const lines = [
    `---`,
    `id: ${note.id}`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    `tags: [${note.tags.map((tag) => tag).join(", ")}]`,
    note.sourceUrl ? `source: ${note.sourceUrl}` : null,
    `---`,
    ``,
    `# ${note.title}`,
    ``,
    note.body,
    ``,
  ].filter((line): line is string => line !== null);

  if (note.sourceUrl) {
    lines.push(`## Source`, ``, note.sourceUrl, ``);
  }

  lines.push(`## Obsidian`, ``, noteWikiLink(note, settings.folder), ``);
  return lines.join("\n");
}

export function formatDumpNotesVaultExport(notes: DumpNote[], settings: DumpNotesSettings) {
  return sortDumpNotesNewestFirst(notes)
    .map((note) => {
      const path = noteVaultPath(note, settings.folder);
      return [
        `<!-- file: ${path}.md -->`,
        formatDumpNoteMarkdown(note, settings).trimEnd(),
        ``,
        `---`,
        ``,
      ].join("\n");
    })
    .join("\n")
    .trimEnd();
}

export function buildObsidianNewUri(note: DumpNote, settings: DumpNotesSettings) {
  const params = new URLSearchParams();
  const vaultName = normalizeVaultName(settings.vaultName);
  if (vaultName) params.set("vault", vaultName);
  params.set("file", noteVaultPath(note, settings.folder));
  params.set("content", formatDumpNoteMarkdown(note, settings));
  return `obsidian://new?${params.toString()}`;
}

export function buildObsidianOpenUri(note: DumpNote, settings: DumpNotesSettings) {
  const params = new URLSearchParams();
  const vaultName = normalizeVaultName(settings.vaultName);
  if (vaultName) params.set("vault", vaultName);
  params.set("file", noteVaultPath(note, settings.folder));
  return `obsidian://open?${params.toString()}`;
}
