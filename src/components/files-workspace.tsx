"use client";

import * as React from "react";
import { Download, File, Folder, Loader2, Trash2, Upload } from "lucide-react";
import { usePinqued } from "@/components/pinqued-session";
import { normalizeFileList, parentPath, pinquedError, type PinquedFileEntry } from "@/lib/pinqued";

function formatSize(size: number | null) {
  if (size == null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesWorkspace() {
  const pinqued = usePinqued();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [path, setPath] = React.useState("/");
  const [entries, setEntries] = React.useState<PinquedFileEntry[]>([]);
  const [preview, setPreview] = React.useState<{ name: string; body: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (nextPath = "/") => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ path: nextPath || "/" });
    const response = await pinqued.request(`files?${query.toString()}`);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const payload = contentType.includes("json") ? await response.json().catch(() => ({})) : {};
      setEntries([]);
      setError(pinquedError(payload, "Could not load Pinqued files"));
      setLoading(false);
      return;
    }
    if (!contentType.includes("json")) {
      setLoading(false);
      setError("Unexpected file listing response");
      return;
    }
    const payload = await response.json().catch(() => ({}));
    const listed = normalizeFileList(payload, nextPath);
    setPath(listed.path);
    setEntries(listed.entries);
    setLoading(false);
  }, [pinqued]);

  React.useEffect(() => {
    void load("/");
  }, [load]);

  async function openEntry(entry: PinquedFileEntry) {
    if (entry.kind === "dir") {
      setPreview(null);
      await load(entry.path);
      return;
    }
    setBusy(true);
    setError(null);
    const response = await pinqued.request(`files?${new URLSearchParams({ path: entry.path }).toString()}`);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const payload = contentType.includes("json") ? await response.json().catch(() => ({})) : {};
      setError(pinquedError(payload, "Could not open file"));
      setBusy(false);
      return;
    }
    if (contentType.includes("json")) {
      const payload = await response.json().catch(() => ({}));
      const listed = normalizeFileList(payload, path);
      if (listed.entries.length) {
        setPath(listed.path);
        setEntries(listed.entries);
        setBusy(false);
        return;
      }
    }
    const blob = await response.blob();
    if (contentType.startsWith("text/") || contentType.includes("json") || entry.name.match(/\.(txt|md|json|js|ts|css|html|xml|log|py|sh)$/i)) {
      setPreview({ name: entry.name, body: await blob.text() });
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = entry.name;
      link.click();
      URL.revokeObjectURL(url);
    }
    setBusy(false);
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const data = new FormData();
    data.set("file", file);
    data.set("path", path);
    const response = await pinqued.request("files", { method: "POST", body: data });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(pinquedError(payload, "Could not upload file"));
    await load(path);
    setBusy(false);
  }

  async function remove(entry: PinquedFileEntry) {
    setBusy(true);
    setError(null);
    const response = await pinqued.request(`files?${new URLSearchParams({ path: entry.path }).toString()}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      const payload = await response.json().catch(() => ({}));
      setError(pinquedError(payload, "Could not delete file"));
    }
    if (preview?.name === entry.name) setPreview(null);
    await load(path);
    setBusy(false);
  }

  async function download(entry: PinquedFileEntry) {
    const response = await pinqued.request(`files?${new URLSearchParams({ path: entry.path, download: "1" }).toString()}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(pinquedError(payload, "Could not download file"));
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = entry.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  const crumbs = path.split("/").filter(Boolean);

  return (
    <div aria-label="File explorer" className="font-mono text-[#e9e3ee]">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Files</h1>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 border border-[#494452] bg-[#1a1920] px-3 text-[10px] disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
      </div>
      {error ? <p role="alert" className="mb-3 text-[10px] text-rose-300">{error}</p> : null}

      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="flex flex-wrap items-center gap-1 border-b border-[#2a2931] px-4 py-2.5 text-[10px] text-[#b0a8b5]">
          <button type="button" onClick={() => void load("/")} className="hover:text-white">/</button>
          {crumbs.map((crumb, index) => {
            const crumbPath = `/${crumbs.slice(0, index + 1).join("/")}`;
            return (
              <span key={crumbPath} className="flex items-center gap-1">
                <span className="text-[#5d5863]">›</span>
                <button type="button" onClick={() => void load(crumbPath)} className="hover:text-white">{crumb}</button>
              </span>
            );
          })}
        </div>
        <div className="min-h-[320px]">
          {path !== "/" ? (
            <button type="button" onClick={() => void load(parentPath(path))} className="flex w-full items-center gap-3 border-b border-[#24232a] px-4 py-3 text-left text-[11px] text-[#9d96a2] hover:bg-white/[.025]">
              <Folder className="h-4 w-4" /> ..
            </button>
          ) : null}
          {loading ? (
            <div className="grid min-h-[240px] place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[#77717e]" /></div>
          ) : entries.length ? (
            entries.map((entry) => (
              <div key={entry.path} className="grid grid-cols-[minmax(0,1fr)_90px_72px] items-center gap-2 border-b border-[#24232a] px-4 py-2.5 text-[11px]">
                <button type="button" onClick={() => void openEntry(entry)} className="flex min-w-0 items-center gap-3 text-left hover:text-white">
                  {entry.kind === "dir" ? <Folder className="h-4 w-4 shrink-0 text-sky-300" /> : <File className="h-4 w-4 shrink-0 text-[#9d96a2]" />}
                  <span className="truncate">{entry.name}</span>
                </button>
                <span className="text-[#77717e]">{entry.kind === "dir" ? "dir" : formatSize(entry.size)}</span>
                <span className="flex justify-end gap-1">
                  {entry.kind === "file" ? (
                    <button type="button" aria-label={`Download ${entry.name}`} onClick={() => void download(entry)} className="grid h-7 w-7 place-items-center text-[#8b8591] hover:text-white"><Download className="h-3.5 w-3.5" /></button>
                  ) : null}
                  <button type="button" aria-label={`Delete ${entry.name}`} onClick={() => void remove(entry)} className="grid h-7 w-7 place-items-center text-[#8b8591] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))
          ) : (
            <div className="grid min-h-[240px] place-items-center px-6 text-center text-[11px] text-[#6f6975]">
              {error ? "File Explorer needs the files scope on your Pinqued API key." : "Empty folder"}
            </div>
          )}
        </div>
      </section>

      {preview ? (
        <section className="mt-4 border border-[#2a2931] bg-[#0d0d11]">
          <div className="border-b border-[#2a2931] px-4 py-2.5 text-[10px] uppercase tracking-[.12em] text-[#a39ba9]">{preview.name}</div>
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words p-4 text-[10px] leading-5 text-[#cbc3d0]">{preview.body || "(empty)"}</pre>
        </section>
      ) : null}
    </div>
  );
}
