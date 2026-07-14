"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Code, Download, FileMusic, FileText, Image as ImageIcon, Link as LinkIcon, Loader2, Mic, Music, Save, Trash2, Upload } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";
import { demoFrequencies, findSignal, type SignalAttachment } from "@/lib/demo-data";

const signalTypes = [
  ["NOTE", FileText], ["LINK", LinkIcon], ["IMAGE", ImageIcon], ["SCREENSHOT", ImageIcon], ["SONG", Music], ["CODE", Code], ["AUDIO", Mic], ["DOCUMENT", Upload], ["FILE", Upload],
] as const;
type SignalTypeValue = (typeof signalTypes)[number][0];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const acceptedExtensions: Record<"image" | "audio" | "document", string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp"],
  audio: ["mp3", "wav", "ogg", "m4a", "flac"],
  document: ["pdf", "txt", "md", "doc", "docx"],
};

function fileCategory(type: SignalTypeValue) {
  if (type === "IMAGE" || type === "SCREENSHOT") return "image";
  if (type === "SONG" || type === "AUDIO") return "audio";
  if (type === "DOCUMENT") return "document";
  return "any";
}

function uploadSignalFile(file: File, signalId: string, onProgress: (value: number) => void) {
  return new Promise<SignalAttachment>((resolve, reject) => {
    const form = new FormData();
    form.set("file", file);
    form.set("signalId", signalId);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/uploads");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    });
    request.addEventListener("load", () => {
      let body: { file?: SignalAttachment; error?: string } = {};
      try { body = JSON.parse(request.responseText); } catch { /* handled below */ }
      if (request.status >= 200 && request.status < 300 && body.file) resolve(body.file);
      else reject(new Error(body.error || "The file upload failed"));
    });
    request.addEventListener("error", () => reject(new Error("The upload was interrupted. Check your connection and try again.")));
    request.addEventListener("abort", () => reject(new Error("The upload was cancelled.")));
    request.send(form);
  });
}

export function SignalComposer({ signalId }: { signalId?: string }) {
  const router = useRouter();
  const existing = signalId ? findSignal(signalId) : undefined;
  const [type, setType] = React.useState<SignalTypeValue>((existing?.type || "NOTE") as SignalTypeValue);
  const [title, setTitle] = React.useState(existing?.title || "");
  const [description, setDescription] = React.useState(existing?.description || existing?.content || "");
  const [sourceUrl, setSourceUrl] = React.useState(existing?.sourceUrl || "");
  const [canImportYouTube, setCanImportYouTube] = React.useState(false);
  const [importYouTube, setImportYouTube] = React.useState(false);
  const [rightsConfirmed, setRightsConfirmed] = React.useState(false);
  const [tags, setTags] = React.useState(existing?.tags.join(", ") || "");
  const [frequencyId, setFrequencyId] = React.useState(existing?.frequency?.id || "");
  const [visibility, setVisibility] = React.useState<string>(existing?.visibility || "PUBLIC");
  const [expiration, setExpiration] = React.useState("NONE");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [existingFiles, setExistingFiles] = React.useState<SignalAttachment[]>(existing?.files || []);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  React.useEffect(() => {
    fetch("/api/user/profile")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ user }) => setCanImportYouTube(user?.username?.toLowerCase() === "hela"))
      .catch(() => setCanImportYouTube(false));
  }, []);

  React.useEffect(() => {
    if (!signalId) return;
    fetch(`/api/signals/${signalId}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ signal }) => {
        setType(signal.type); setTitle(signal.title || ""); setDescription(signal.content || signal.description || "");
        setSourceUrl(signal.sourceUrl || ""); setTags(typeof signal.tags === "string" ? signal.tags.split(",").join(", ") : (signal.tags || []).join(", "));
        setFrequencyId(signal.frequencyId || ""); setVisibility(signal.visibility || "PUBLIC"); setExpiration(signal.ghostMode || "NONE"); setExistingFiles(signal.files || []);
      })
      .catch(() => { if (!existing) setError("This signal could not be loaded for editing."); });
  }, [signalId, existing]);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const category = fileCategory(type);
    const allowed = [...acceptedExtensions.image, ...acceptedExtensions.audio, ...acceptedExtensions.document];
    if (!allowed.includes(extension) || (category !== "any" && !acceptedExtensions[category].includes(extension))) {
      setError(`Choose a supported ${category === "any" ? "image, audio, PDF, text, or document" : category} file.`);
      event.target.value = "";
      return;
    }
    if (file.size <= 0) { setError("The selected file is empty."); return; }
    if (file.size > MAX_FILE_SIZE) { setError("Files must be 10 MB or smaller."); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setProgress(0);
  }

  async function removeExistingFile(file: SignalAttachment) {
    if (!window.confirm(`Remove ${file.originalName}?`)) return;
    setError("");
    const response = await fetch(`/api/files/${encodeURIComponent(file.filename)}`, { method: "DELETE" });
    if (!response.ok) { setError("The attachment could not be removed."); return; }
    setExistingFiles((items) => items.filter((item) => item.id !== file.id));
  }

  async function submit(event: { preventDefault(): void }, draft = false) {
    event.preventDefault(); setError("");
    if (!title.trim()) { setError("Give this signal a title before saving."); return; }
    if (type === "LINK" || (type === "SONG" && sourceUrl)) { try { const url = new URL(sourceUrl); if (!/^https?:$/.test(url.protocol)) throw new Error(); } catch { setError("Enter a valid Spotify, YouTube, or HTTP link."); return; } }
    if (importYouTube && !rightsConfirmed) { setError("Confirm that you have permission to import this media."); return; }
    if (importYouTube && selectedFile) { setError("Choose either a file upload or YouTube import, not both."); return; }
    const requiresFile = ["IMAGE", "SCREENSHOT", "SONG", "AUDIO", "DOCUMENT", "FILE"].includes(type);
    if (requiresFile && !selectedFile && existingFiles.length === 0 && !(type === "SONG" && sourceUrl) && !draft) { setError("Choose a file or add a music link before publishing this Signal."); return; }
    setSaving(true); setProgress(0);
    const payload = { type, title, description, content: description, sourceUrl: sourceUrl || null, frequencyId: frequencyId || null, tags, visibility, ghostMode: expiration, isDraft: draft };
    let createdSignalId: string | undefined;
    try {
      const response = await fetch(signalId ? `/api/signals/${signalId}` : "/api/signals", { method: signalId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        if (response.status === 401) throw new Error("Sign in before saving a Signal with files.");
        const data = await response.json();
        const detail = Array.isArray(data.details) ? data.details[0]?.message : undefined;
        throw new Error(detail || data.error || "Unable to save signal");
      }
      const data = await response.json();
      createdSignalId = data.signal?.id || signalId;
      if (selectedFile && createdSignalId) {
        const uploaded = await uploadSignalFile(selectedFile, createdSignalId, setProgress);
        setExistingFiles((items) => [...items, uploaded]);
      }
      if (importYouTube && createdSignalId) {
        setProgress(15);
        const importedResponse = await fetch("/api/youtube-import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signalId: createdSignalId, url: sourceUrl, rightsConfirmed }) });
        const importedData = await importedResponse.json();
        if (!importedResponse.ok) throw new Error(importedData.error || "The YouTube import failed");
        setExistingFiles((items) => [...items, importedData.file]);
      }
      setProgress(selectedFile || importYouTube ? 100 : 0); setSaved(true);
      window.setTimeout(() => router.push(draft ? "/archive" : `/signals/${createdSignalId}`), 350);
    } catch (reason) {
      if (!signalId && createdSignalId) await fetch(`/api/signals/${createdSignalId}`, { method: "DELETE" }).catch(() => undefined);
      setError(reason instanceof Error ? reason.message : "Unable to save signal");
    } finally { setSaving(false); }
  }

  const category = fileCategory(type);
  const accept = category === "image" ? ".jpg,.jpeg,.png,.gif,.webp" : category === "audio" ? ".mp3,.wav,.ogg,.m4a,.flac" : category === "document" ? ".pdf,.txt,.md,.doc,.docx" : ".jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg,.m4a,.flac,.pdf,.txt,.md,.doc,.docx";
  const showFile = ["IMAGE", "SCREENSHOT", "SONG", "AUDIO", "DOCUMENT", "FILE"].includes(type);

  return <AppLayout showRightSidebar={false}>
    <PageHeading eyebrow={signalId ? "Edit signal" : "New signal"} title={signalId ? "Refine this fragment" : "Save something worth returning to"} description="Choose a shape, add context, and decide who can find it." />
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Panel label="Signal type"><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">{signalTypes.map(([value, Icon]) => <button type="button" key={value} onClick={() => { setType(value); setSelectedFile(null); setProgress(0); setError(""); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(""); }} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border font-mono text-[9px] transition ${type === value ? "border-violet-400/30 bg-violet-400/[.08] text-violet-300" : "border-white/[.07] text-zinc-600 hover:text-zinc-300"}`}><Icon className="h-4 w-4" />{value === "AUDIO" ? "VOICE" : value}</button>)}</div></Panel>
        <Panel label="Details"><div className="space-y-4"><Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name this signal" /></Field>{(type === "LINK" || type === "SONG") && <Field label={type === "SONG" ? "Spotify or YouTube link (optional)" : "Source URL"}><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder={type === "SONG" ? "https://open.spotify.com/... or https://youtube.com/..." : "https://..."} type="url" /></Field>}{type === "SONG" && canImportYouTube && <div className="rounded-lg border border-violet-400/15 bg-violet-400/[.04] p-3 font-mono text-[10px] text-zinc-400"><label className="flex cursor-pointer items-start gap-2"><input type="checkbox" checked={importYouTube} onChange={(event) => { setImportYouTube(event.target.checked); if (!event.target.checked) setRightsConfirmed(false); }} className="mt-0.5 accent-violet-400" /><span><strong className="block font-normal text-violet-200">Import YouTube audio as a file</strong><span className="mt-1 block text-[9px] text-zinc-600">Single public video, 10 minutes and 10 MB maximum. Playlists and live media are blocked.</span></span></label>{importYouTube && <label className="mt-3 flex cursor-pointer items-start gap-2 border-t border-white/[.06] pt-3"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-0.5 accent-violet-400" /><span>I own this media or have permission from its rights holder to save it.</span></label>}</div>}<Field label={type === "CODE" ? "Code" : type === "NOTE" ? "Note" : "Description"}><textarea rows={type === "CODE" ? 12 : 6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add the detail that will help later..." className={type === "CODE" ? "font-mono" : ""} /></Field><Field label="Tags"><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="design, attention, night" /></Field></div></Panel>
        {showFile && <Panel label="File"><div className="space-y-3">{existingFiles.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-lg border border-white/[.08] bg-white/[.02] p-3"><AttachmentIcon mimeType={file.mimeType} /><div className="min-w-0 flex-1"><p className="truncate font-mono text-[11px] text-zinc-300">{file.originalName}</p><p className="mt-1 font-mono text-[9px] text-zinc-600">{formatBytes(file.size)} · uploaded</p></div><a href={`${file.url}?download=1`} className="rounded-md p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-200" aria-label={`Download ${file.originalName}`}><Download className="h-4 w-4" /></a><button type="button" onClick={() => removeExistingFile(file)} className="rounded-md p-2 text-zinc-600 hover:bg-red-400/5 hover:text-red-300" aria-label={`Remove ${file.originalName}`}><Trash2 className="h-4 w-4" /></button></div>)}<label className="flex cursor-pointer flex-col items-center overflow-hidden rounded-xl border border-dashed border-white/10 px-5 py-8 text-center hover:bg-white/[.02]">{selectedFile && category === "image" && previewUrl ? <img src={previewUrl} alt="Selected upload preview" className="mb-4 max-h-56 w-full rounded-lg object-contain" /> : selectedFile && category === "audio" && previewUrl ? <audio src={previewUrl} controls className="mb-4 w-full max-w-md" /> : <Upload className="mb-3 h-5 w-5 text-violet-300" />}<span className="font-mono text-xs text-zinc-300">{selectedFile?.name || (existingFiles.length ? "Choose another file" : "Choose a file")}</span><span className="mt-2 font-mono text-[9px] text-zinc-600">{category === "image" ? "JPG, PNG, GIF, or WebP" : category === "audio" ? "MP3, WAV, OGG, M4A, or FLAC" : category === "document" ? "PDF, text, Word, or Markdown" : "Image, audio, PDF, text, or Word"} · 10 MB max</span><input type="file" className="sr-only" onChange={pickFile} accept={accept} />{saving && selectedFile && <span className="mt-5 w-full max-w-md"><span className="mb-2 flex justify-between font-mono text-[9px] text-zinc-500"><span>{progress < 100 ? "Uploading…" : "Upload complete"}</span><span>{progress}%</span></span><span className="block h-1 overflow-hidden rounded bg-zinc-900"><i className="block h-full bg-violet-400 transition-[width]" style={{ width: `${progress}%` }} /></span></span>}</label></div></Panel>}
      </div>
      <aside className="space-y-6"><Panel label="Publish"><Field label="Frequency"><select value={frequencyId} onChange={(e) => setFrequencyId(e.target.value)}><option value="">No frequency</option>{demoFrequencies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Visibility"><select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option><option value="UNLISTED">Unlisted</option><option value="SELECTED_USERS">Selected users</option><option value="COLLABORATORS_ONLY">Collaborators only</option></select></Field><Field label="Ghost mode"><select value={expiration} onChange={(e) => setExpiration(e.target.value)}><option value="NONE">Never expires</option><option value="ONE_HOUR">After one hour</option><option value="ONE_DAY">After one day</option><option value="ONE_WEEK">After one week</option><option value="OPEN_ONCE">After one open</option></select></Field>{error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/[.06] p-3 font-mono text-[10px] text-red-300">{error}</p>}<div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={(event) => submit(event, true)} className="h-11 rounded-lg border border-white/10 font-mono text-[11px] text-zinc-400 hover:bg-white/[.03] disabled:opacity-50"><Save className="mr-2 inline h-3.5 w-3.5" />Draft</button><button disabled={saving || saved} className="h-11 rounded-lg bg-violet-400/[.13] font-mono text-[11px] text-violet-200 hover:bg-violet-400/[.2] disabled:opacity-60">{saving ? <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="mr-2 inline h-3.5 w-3.5" /> : null}{saving && importYouTube ? "Importing" : saving && selectedFile ? "Uploading" : saved ? "Saved" : signalId ? "Update" : "Publish"}</button></div></Panel></aside>
    </form>
  </AppLayout>;
}

function AttachmentIcon({ mimeType }: { mimeType: string }) { return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[.08] bg-white/[.025]">{mimeType.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-violet-300" /> : mimeType.startsWith("audio/") ? <FileMusic className="h-4 w-4 text-violet-300" /> : <FileText className="h-4 w-4 text-violet-300" />}</span>; }
function formatBytes(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`; }
function Panel({ label, children }: { label: string; children: React.ReactNode }) { return <section className="rounded-xl border border-white/[.07] bg-white/[.015] p-5 sm:p-6"><h2 className="mb-5 font-mono text-[9px] uppercase tracking-[.16em] text-zinc-500">{label}</h2>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactElement }) { return <label className="mb-4 block font-mono text-[10px] text-zinc-500 last:mb-0"><span className="mb-2 block uppercase tracking-wider">{label}</span>{React.cloneElement(children as React.ReactElement<{ className?: string }>, { className: `w-full rounded-lg border border-white/[.08] bg-[#0b0c11] px-3 py-2.5 font-mono text-xs text-zinc-200 outline-none transition focus:border-violet-400/30 ${(children.props as { className?: string }).className || ""}` })}</label>; }
