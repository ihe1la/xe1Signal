"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, ExternalLink, Heart, MessageCircle, Pencil, Send, Share2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { SignalCard } from "@/components/signals/signal-card";
import { type DemoSignal } from "@/lib/demo-data";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string; name: string | null; avatarUrl: string | null };
};

export function SignalDetail({ signal, canEdit = false }: { signal: DemoSignal & { isReacted?: boolean; isSaved?: boolean }; canEdit?: boolean }) {
  const router = useRouter();
  const [comment, setComment] = React.useState("");
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(true);
  const [commentBusy, setCommentBusy] = React.useState(false);
  const [reacted, setReacted] = React.useState(Boolean(signal.isReacted));
  const [saved, setSaved] = React.useState(Boolean(signal.isSaved));
  const [reactionCount, setReactionCount] = React.useState(signal.reactionCount || 0);
  const [saveCount, setSaveCount] = React.useState(signal.saveCount || 0);
  const [actionBusy, setActionBusy] = React.useState<"react" | "save" | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/signals/${signal.id}/comments`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (active) setComments(Array.isArray(data.comments) ? data.comments : []); })
      .catch(() => { if (active) toast.error("Comments could not be loaded"); })
      .finally(() => { if (active) setCommentsLoading(false); });
    return () => { active = false; };
  }, [signal.id]);

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    const content = comment.trim();
    if (!content || commentBusy) return;
    setCommentBusy(true);
    try {
      const response = await fetch(`/api/signals/${signal.id}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Comment could not be posted");
      setComments((items) => [result.comment, ...items]);
      setComment("");
      toast.success("Comment posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment could not be posted");
    } finally {
      setCommentBusy(false);
    }
  }

  async function toggleReaction() {
    if (actionBusy) return;
    setActionBusy("react");
    try {
      const response = await fetch(`/api/signals/${signal.id}/reactions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "STAR" }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Reaction could not be updated");
      setReactionCount((count) => Math.max(0, count + (result.active ? 1 : -1)));
      setReacted(Boolean(result.active));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reaction could not be updated");
    } finally { setActionBusy(null); }
  }

  async function toggleSave() {
    if (actionBusy) return;
    setActionBusy("save");
    try {
      const response = await fetch(`/api/signals/${signal.id}/save`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Signal could not be saved");
      setSaveCount((count) => Math.max(0, count + (result.saved ? 1 : -1)));
      setSaved(Boolean(result.saved));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signal could not be saved");
    } finally { setActionBusy(null); }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: signal.title || "Signal", url: location.href });
      else { await navigator.clipboard.writeText(location.href); toast.success("Signal link copied"); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Signal could not be shared");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this signal?")) return;
    const response = await fetch(`/api/signals/${signal.id}`, { method: "DELETE" });
    if (response.ok) router.push("/archive");
    else toast.error("Signal could not be deleted");
  }

  const displayedSignal = { ...signal, reactionCount, saveCount, isReacted: reacted, isSaved: saved };
  return <AppLayout>
    <Link href="/discover" className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] text-zinc-500 hover:text-zinc-200"><ArrowLeft className="h-3.5 w-3.5" />Back to archive</Link>
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <SignalCard key={`${reactionCount}:${saveCount}:${reacted}:${saved}`} signal={displayedSignal} variant="featured" onReact={(_, __, active) => { setReacted(active); setReactionCount((count) => Math.max(0, count + (active ? 1 : -1))); }} onSave={(_, active) => { setSaved(active); setSaveCount((count) => Math.max(0, count + (active ? 1 : -1))); }} />
        <section id="comments" className="mt-8 rounded-xl border border-white/[.07] bg-white/[.015] p-5">
          <div className="mb-5 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-violet-300"/><h2 className="font-mono text-sm">Conversation</h2><span className="font-mono text-[10px] text-zinc-600">{comments.length}</span></div>
          <form onSubmit={addComment} className="mb-6 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add to the conversation..." className="h-11 flex-1 rounded-lg border border-white/[.08] bg-[#0a0b10] px-3 font-mono text-xs outline-none focus:border-violet-400/30"/><button disabled={commentBusy || !comment.trim()} className="grid h-11 w-11 place-items-center rounded-lg bg-violet-400/[.12] text-violet-300 disabled:opacity-40" aria-label="Post comment"><Send className="h-4 w-4"/></button></form>
          <div className="space-y-5">{commentsLoading ? <p className="py-8 text-center font-mono text-[10px] text-zinc-600">Loading conversation...</p> : comments.length ? comments.map((item) => <article key={item.id} className="flex gap-3"><img src={item.user.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(item.user.username)}`} alt="" className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"/><div><p className="font-mono text-[10px] text-zinc-400">{item.user.name || item.user.username} <span className="text-zinc-700">@{item.user.username} · {new Date(item.createdAt).toLocaleDateString()}</span></p><p className="mt-1.5 font-mono text-[11px] leading-5 text-zinc-300">{item.content}</p></div></article>) : <p className="py-8 text-center font-mono text-[10px] text-zinc-600">No comments yet. Start the conversation.</p>}</div>
        </section>
      </div>
      <aside className="space-y-4">
        <section className="rounded-xl border border-white/[.07] bg-white/[.015] p-5"><p className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">Signal details</p><dl className="mt-5 space-y-4 font-mono text-[10px]"><Row label="Strength" value={`${signal.signalStrength}%`}/><Row label="Saved" value={String(saveCount)}/><Row label="Reactions" value={String(reactionCount)}/><Row label="Visibility" value={signal.visibility.toLowerCase()}/><Row label="Frequency" value={signal.frequency?.name || "Unsorted"}/></dl></section>
        <div className="grid grid-cols-2 gap-2"><Action icon={Heart} label={reacted ? "Reacted" : "React"} active={reacted} busy={actionBusy === "react"} onClick={toggleReaction}/><Action icon={Bookmark} label={saved ? "Saved" : "Save"} active={saved} busy={actionBusy === "save"} onClick={toggleSave}/><Action icon={Share2} label="Share" onClick={share}/>{signal.sourceUrl ? <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[.07] font-mono text-[10px] text-zinc-500 hover:text-zinc-200"><ExternalLink className="h-3.5 w-3.5"/>Source</a> : <a href="#comments" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[.07] font-mono text-[10px] text-zinc-500 hover:text-zinc-200"><MessageCircle className="h-3.5 w-3.5"/>Comment</a>}</div>
        {canEdit && <><Link href={`/signals/${signal.id}/edit`} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[.07] font-mono text-[10px] text-zinc-500 hover:text-zinc-200"><Pencil className="h-3.5 w-3.5"/>Edit signal</Link><button onClick={() => void remove()} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-400/10 font-mono text-[10px] text-red-400/60 hover:bg-red-400/[.04]"><Trash2 className="h-3.5 w-3.5"/>Delete signal</button></>}
      </aside>
    </div>
  </AppLayout>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><dt className="text-zinc-600">{label}</dt><dd className="truncate text-zinc-300">{value}</dd></div>; }
function Action({ icon: Icon, label, onClick, active = false, busy = false }: { icon: React.ElementType; label: string; onClick: () => void | Promise<void>; active?: boolean; busy?: boolean }) { return <button disabled={busy} onClick={() => void onClick()} className={`flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[.07] font-mono text-[10px] hover:bg-white/[.03] disabled:opacity-40 ${active ? "text-violet-300" : "text-zinc-500"}`}><Icon className={`h-3.5 w-3.5 ${active ? "fill-current" : ""}`}/>{label}</button>; }
