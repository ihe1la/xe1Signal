"use client";

import * as React from "react";
import {
  Copy,
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  Pencil,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  DUMP_NOTES_SETTINGS_KEY,
  DUMP_NOTES_STORAGE_KEY,
  buildObsidianNewUri,
  buildObsidianOpenUri,
  createDumpNote,
  formatDumpNoteMarkdown,
  formatDumpNotesVaultExport,
  noteWikiLink,
  parseDumpNotes,
  parseDumpNotesSettings,
  searchDumpNotes,
  serializeDumpNotes,
  serializeDumpNotesSettings,
  slugifyNoteTitle,
  sortDumpNotesNewestFirst,
  updateDumpNote,
  type DumpNote,
  type DumpNotesSettings,
} from "@/lib/dump-notes";
import { MessyNoteBody, NoteMarkdownField } from "@/components/messy-note-body";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { mergeUpdatedItems } from "@/lib/merge-updated-items";

type VaultFileHandle = {
  createWritable: () => Promise<{ write: (value: string) => Promise<void>; close: () => Promise<void> }>;
};

type VaultDirectoryHandle = {
  name: string;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<VaultDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<VaultFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<VaultDirectoryHandle>;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DumpNotesWorkspace() {
  const [notes, setNotes] = React.useState<DumpNote[]>([]);
  const [settings, setSettings] = React.useState<DumpNotesSettings>({
    vaultName: "Vault",
    folder: "xe1Signal/Dump",
  });
  const [hydrated, setHydrated] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftBody, setDraftBody] = React.useState("");
  const [draftSource, setDraftSource] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editBody, setEditBody] = React.useState("");
  const [editSource, setEditSource] = React.useState("");
  const [flash, setFlash] = React.useState<string | null>(null);
  const [vaultReady, setVaultReady] = React.useState(false);
  const [syncState, setSyncState] = React.useState<"syncing" | "synced" | "local">("syncing");
  const syncReadyRef = React.useRef(false);
  const vaultRef = React.useRef<VaultDirectoryHandle | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const existing = sortDumpNotesNewestFirst(
      parseDumpNotes(window.localStorage.getItem(DUMP_NOTES_STORAGE_KEY)),
    );
    const migrated = window.localStorage.getItem("xe1signal-tools-dump-notes-account-sync-v1") === "true";
    setNotes(existing);
    setSettings(parseDumpNotesSettings(window.localStorage.getItem(DUMP_NOTES_SETTINGS_KEY)));
    setHydrated(true);

    let active = true;
    void fetch("/api/tools/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "dump-notes", items: existing, mode: migrated ? "pull" : "merge" }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Notes could not sync");
        const data = (await response.json()) as { items?: unknown[] };
        const accountItems = parseDumpNotes(JSON.stringify(data.items || []));
        if (!active) return;
        window.localStorage.setItem("xe1signal-tools-dump-notes-account-sync-v1", "true");
        syncReadyRef.current = true;
        setNotes((current) =>
          sortDumpNotesNewestFirst(mergeUpdatedItems(current, accountItems)),
        );
        setSyncState("synced");
      })
      .catch(() => {
        if (!active) return;
        syncReadyRef.current = true;
        setSyncState("local");
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DUMP_NOTES_STORAGE_KEY, serializeDumpNotes(notes));
  }, [notes, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !syncReadyRef.current) return;
    const timer = window.setTimeout(() => {
      setSyncState("syncing");
      void fetch("/api/tools/notes", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: "dump-notes", items: notes }),
      })
        .then((response) => setSyncState(response.ok ? "synced" : "local"))
        .catch(() => setSyncState("local"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [notes, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(DUMP_NOTES_SETTINGS_KEY, serializeDumpNotesSettings(settings));
  }, [settings, hydrated]);

  const visible = React.useMemo(
    () => searchDumpNotes(sortDumpNotesNewestFirst(notes), query),
    [notes, query],
  );

  function flashMessage(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 1600);
  }

  async function copyText(text: string, message: string) {
    flashMessage((await copyTextToClipboard(text)) ? message : "Copy failed");
  }

  function addNote() {
    const next = createDumpNote({
      title: draftTitle,
      body: draftBody,
      sourceUrl: draftSource,
    });
    if (!next) return;
    setNotes((current) => [next, ...current]);
    setDraftTitle("");
    setDraftBody("");
    setDraftSource("");
    bodyRef.current?.focus();
    flashMessage("Note saved");
  }

  function onCaptureKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      addNote();
    }
  }

  function startEdit(note: DumpNote) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditSource(note.sourceUrl || "");
  }

  function saveEdit() {
    if (!editingId) return;
    const trimmed = editBody.trim();
    if (!trimmed) {
      setNotes((current) => current.filter((item) => item.id !== editingId));
      setEditingId(null);
      return;
    }
    setNotes((current) =>
      current.map((item) =>
        item.id === editingId
          ? updateDumpNote(item, {
              title: editTitle,
              body: editBody,
              sourceUrl: editSource.trim() ? editSource : null,
            })
          : item,
      ),
    );
    setEditingId(null);
  }

  function removeNote(id: string) {
    setNotes((current) => current.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function setVaultName(value: string) {
    vaultRef.current = null;
    setVaultReady(false);
    setSettings((current) => ({ ...current, vaultName: value }));
  }

  async function chooseVault() {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) {
      flashMessage("Choose a vault in Chrome or the desktop app");
      return;
    }
    try {
      const handle = await picker({ mode: "readwrite" });
      await handle.getDirectoryHandle(".obsidian", { create: true });
      vaultRef.current = handle;
      setVaultReady(true);
      setSettings((current) => ({ ...current, vaultName: handle.name }));
      flashMessage(`Vault connected: ${handle.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      flashMessage("Vault could not be connected");
    }
  }

  async function writeNoteToVault(note: DumpNote) {
    const root = vaultRef.current;
    if (!root) return false;
    let folder = root;
    for (const part of settings.folder.split(/[\\/]+/).filter(Boolean)) {
      folder = await folder.getDirectoryHandle(part, { create: true });
    }
    const file = await folder.getFileHandle(`${slugifyNoteTitle(note.title)}.md`, { create: true });
    const writable = await file.createWritable();
    await writable.write(formatDumpNoteMarkdown(note, settings));
    await writable.close();
    return true;
  }

  function launchObsidianUri(href: string) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function openInObsidian(note: DumpNote, mode: "new" | "open") {
    if (!settings.vaultName.trim()) {
      setShowSettings(true);
      flashMessage("Choose your Obsidian vault first");
      return;
    }
    try {
      const wrote = vaultRef.current ? await writeNoteToVault(note) : false;
      const href = wrote || mode === "open" ? buildObsidianOpenUri(note, settings) : buildObsidianNewUri(note, settings);
      launchObsidianUri(href);
      flashMessage(wrote ? "Note saved to Obsidian" : mode === "new" ? "Opening Obsidian (new note)" : "Opening Obsidian");
    } catch {
      flashMessage("Could not write to this vault");
    }
  }

  function downloadVaultExport() {
    const markdown = formatDumpNotesVaultExport(notes, settings);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xe1signal-dump-notes.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    flashMessage("Markdown exported");
  }

  return (
    <div aria-label="Dump notes section" className="mx-auto max-w-[860px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl font-sans text-sm text-zinc-500">
          Dump what you saw, paste markdown, or write freely. Link each note into your Obsidian vault.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[10px]",
              syncState === "local"
                ? "border-amber-400/20 text-amber-200/70"
                : "border-white/[.08] text-zinc-500",
            )}
            title={syncState === "local" ? "Saved in this app only" : "Saved to your account"}
          >
            {syncState === "local" ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
            {syncState === "syncing" ? "Syncing" : syncState === "synced" ? "Account" : "Local"}
          </span>
          <button
            type="button"
            onClick={() => setShowSettings((current) => !current)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border px-3 font-sans text-xs transition",
              showSettings
                ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                : "border-white/[.08] bg-white/[.03] text-zinc-400 hover:border-violet-400/25 hover:text-violet-200",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Obsidian
          </button>
          <button
            type="button"
            onClick={downloadVaultExport}
            disabled={notes.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.03] px-3 font-sans text-xs text-zinc-400 transition hover:border-violet-400/25 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export .md
          </button>
        </div>
      </div>

      {flash ? (
        <p className="mb-3 font-sans text-[11px] text-emerald-300/85" role="status">
          {flash}
        </p>
      ) : null}

      {showSettings ? (
        <section className="mb-5 rounded-2xl border border-violet-400/20 bg-[#0d0e14]/92 p-4">
          <p className="font-sans text-[11px] uppercase tracking-[.14em] text-violet-300/80">Obsidian link</p>
          <p className="mt-2 font-sans text-[12px] text-zinc-500">
            Set your vault + folder. “Send to Obsidian” uses the{" "}
            <code className="text-zinc-400">obsidian://</code> URI scheme.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-sans text-[11px] text-zinc-500">Vault name</span>
              <input
                value={settings.vaultName}
                onChange={(event) => setVaultName(event.target.value)}
                placeholder="Vault"
                className="h-10 w-full rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 font-sans text-sm text-zinc-100 outline-none focus:border-violet-400/30"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-sans text-[11px] text-zinc-500">Folder path</span>
              <input
                value={settings.folder}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, folder: event.target.value }))
                }
                placeholder="xe1Signal/Dump"
                className="h-10 w-full rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 font-sans text-sm text-zinc-100 outline-none focus:border-violet-400/30"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void chooseVault()}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 font-sans text-xs text-violet-100 transition hover:border-violet-300/40"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {vaultReady ? `Vault connected: ${settings.vaultName}` : "Choose / create vault folder"}
          </button>
          <p className="mt-3 font-mono text-[11px] text-zinc-600">
            Example wiki link: [[
            {settings.folder.trim() || "xe1Signal/Dump"}/My note]]
          </p>
        </section>
      ) : null}

      <section className="sticky top-4 z-20 mb-5 min-w-0 overflow-hidden rounded-2xl border border-violet-400/20 bg-[#0d0e14]/92 p-3 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-md sm:p-4">
        <label htmlFor="dump-note-title" className="sr-only">
          Note title
        </label>
        <input
          id="dump-note-title"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="Title (optional — first line used if empty)"
          className="mb-2 w-full bg-transparent px-1 py-1 font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <label htmlFor="dump-note-body" className="sr-only">
          Dump note body
        </label>
        <NoteMarkdownField
          id="dump-note-body"
          textareaRef={bodyRef}
          value={draftBody}
          onChange={setDraftBody}
          onKeyDown={onCaptureKeyDown}
          rows={5}
          placeholder={"## Dump\nPaste a page excerpt, write `code`, or a list:\n- what you saw\n#tags"}
          textareaClassName="min-h-[120px] w-full resize-y break-words bg-transparent px-1 py-1 font-sans text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 [overflow-wrap:anywhere]"
        />
        <label htmlFor="dump-note-source" className="sr-only">
          Source URL
        </label>
        <input
          id="dump-note-source"
          value={draftSource}
          onChange={(event) => setDraftSource(event.target.value)}
          placeholder="Source URL (optional)"
          className="mt-2 w-full border-t border-white/[.06] bg-transparent px-1 pt-3 font-mono text-[12px] text-zinc-400 outline-none placeholder:text-zinc-600"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-3">
          <p className="font-sans text-[11px] text-zinc-600">Markdown · Ctrl/⌘+Enter to save</p>
          <button
            type="button"
            onClick={addNote}
            disabled={!draftBody.trim()}
            className="inline-flex h-9 items-center rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 text-xs font-medium text-violet-100 transition hover:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </section>

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <label htmlFor="dump-note-search" className="sr-only">
          Search dump notes
        </label>
        <input
          id="dump-note-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, body, source, #tags…"
          className="w-full bg-transparent font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <span className="shrink-0 font-sans text-[11px] text-zinc-600">
          {visible.length}/{notes.length}
        </span>
      </div>

      {!hydrated ? (
        <p className="py-16 text-center font-sans text-sm text-zinc-600">Loading notes…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[.08] px-6 py-16 text-center">
          <FileText className="mx-auto h-5 w-5 text-zinc-600" />
          <p className="mt-3 font-sans text-sm text-zinc-400">
            {notes.length === 0
              ? "Nothing dumped yet. Paste or write above."
              : "No notes match that search."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Dump notes list">
          {visible.map((note) => {
            const editing = editingId === note.id;
            return (
              <li
                key={note.id}
                className={cn(
                  "min-w-0 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02] p-4 transition",
                  editing && "border-violet-400/30 bg-violet-500/[.05]",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <time className="font-sans text-[11px] text-zinc-600" dateTime={note.updatedAt}>
                      {formatWhen(note.updatedAt)}
                    </time>
                    {!editing ? (
                      <h3 className="mt-1 break-words font-sans text-[15px] font-medium text-zinc-100 [overflow-wrap:anywhere]">
                        {note.title}
                      </h3>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      aria-label="Copy Obsidian wiki link"
                      title="Copy [[wikilink]]"
                      onClick={() => void copyText(noteWikiLink(note, settings.folder), "Wiki link copied")}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-violet-200"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Copy markdown"
                      title="Copy markdown"
                      onClick={() =>
                        void copyText(formatDumpNoteMarkdown(note, settings), "Markdown copied")
                      }
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Send to Obsidian"
                      title="Send to Obsidian"
                      onClick={() => openInObsidian(note, "new")}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-violet-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Edit note"
                      onClick={() => (editing ? saveEdit() : startEdit(note))}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete note"
                      onClick={() => removeNote(note.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <input
                      aria-label="Edit note title"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="w-full rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2 font-sans text-sm text-zinc-100 outline-none focus:border-violet-400/30"
                    />
                    <NoteMarkdownField
                      ariaLabel="Edit note body"
                      value={editBody}
                      onChange={setEditBody}
                      rows={6}
                      textareaClassName="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-sans text-sm leading-6 text-zinc-100 outline-none focus:border-violet-400/30"
                    />
                    <input
                      aria-label="Edit source URL"
                      value={editSource}
                      onChange={(event) => setEditSource(event.target.value)}
                      placeholder="Source URL"
                      className="w-full rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2 font-mono text-[12px] text-zinc-300 outline-none focus:border-violet-400/30"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-8 rounded-lg px-3 font-sans text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="h-8 rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 font-sans text-xs text-violet-100"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <MessyNoteBody body={note.body} linkUrls />
                    {note.sourceUrl ? (
                      <a
                        href={note.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex max-w-full items-center gap-1 break-all font-mono text-[11px] text-violet-300 underline decoration-violet-400/30 underline-offset-2 hover:text-violet-200"
                      >
                        {note.sourceUrl}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                      </a>
                    ) : null}
                    <p className="mt-3 break-all font-mono text-[11px] text-zinc-600 [overflow-wrap:anywhere]">
                      {noteWikiLink(note, settings.folder)}
                    </p>
                    {note.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setQuery(`#${tag}`)}
                            className="rounded-md border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 font-sans text-[11px] text-violet-200/90 transition hover:border-violet-300/30"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openInObsidian(note, "new")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-3 font-sans text-[11px] text-violet-100 transition hover:border-violet-300/40"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Send to Obsidian
                      </button>
                      <button
                        type="button"
                        onClick={() => openInObsidian(note, "open")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 font-sans text-[11px] text-zinc-400 transition hover:border-violet-400/25 hover:text-violet-200"
                      >
                        Open in vault
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
