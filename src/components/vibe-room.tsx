"use client";

import * as React from "react";
import { ChevronRight, Disc3, Headphones, ImagePlus, Link2, LoaderCircle, Pause, Play, Radio, SkipForward, Trash2, X } from "lucide-react";

import { useAudioPlayer } from "@/components/audio-player-provider";
import type { VibePlaylistPayload, VibeQueuePayload, VibeSnapshot } from "@/lib/vibe-server";

export function VibeRoom() {
  const [snapshot, setSnapshot] = React.useState<VibeSnapshot | null>(null);
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = React.useState(false);
  const [openShelfId, setOpenShelfId] = React.useState<string | null>(null);
  const player = useAudioPlayer();
  const playerRef = React.useRef(player);
  const controlRef = React.useRef<(action: VibeAction, itemId?: string) => Promise<void>>(() => Promise.resolve());
  const nowPlayingRef = React.useRef<VibeQueuePayload | null>(null);
  const roomPlayingRef = React.useRef(false);
  const dismissedItemIdRef = React.useRef<string | null>(null);
  const artistsKey = snapshot?.nowPlaying?.artists.join(", ") ?? "";
  playerRef.current = player;
  nowPlayingRef.current = snapshot?.nowPlaying || null;
  roomPlayingRef.current = snapshot?.room.isPlaying || false;

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem("vibe-open-shelf");
      if (saved) setOpenShelfId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const closeShelf = React.useCallback(() => {
    setOpenShelfId(null);
    try {
      window.localStorage.removeItem("vibe-open-shelf");
    } catch {
      /* ignore */
    }
  }, []);

  function openShelf(id: string) {
    setOpenShelfId(id);
    try {
      window.localStorage.setItem("vibe-open-shelf", id);
    } catch {
      /* ignore */
    }
  }

  const loadSnapshot = React.useCallback(async () => {
    try {
      const response = await fetch("/api/vibe", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Vibe state is unavailable");
      setSnapshot(data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vibe state is unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    const load = async () => { if (active) await loadSnapshot(); };
    void load();
    const source = new EventSource("/api/vibe/events");
    source.addEventListener("vibe", () => { void load(); });
    let fallbackPoll: number | undefined;
    source.onerror = () => {
      source.close();
      if (fallbackPoll === undefined) fallbackPoll = window.setInterval(() => { void load(); }, 10_000);
    };
    return () => {
      active = false;
      source.close();
      if (fallbackPoll !== undefined) window.clearInterval(fallbackPoll);
    };
  }, [loadSnapshot]);

  const sendControl = React.useCallback(async (action: VibeAction, itemId?: string) => {
    if (action === "play" || action === "select") dismissedItemIdRef.current = null;
    const response = await fetch("/api/vibe/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...(action === "clear" ? {} : { itemId }) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Vibe control failed");
    setSnapshot(data);
    setError(null);
  }, []);
  controlRef.current = sendControl;

  React.useEffect(() => {
    const item = nowPlayingRef.current;
    if (!item?.fileUrl) {
      if (playerRef.current.current?.id.startsWith("vibe:")) playerRef.current.stop();
      return;
    }
    if (dismissedItemIdRef.current === item.id) return;

    const track = {
      id: `vibe:${item.id}`,
      title: item.title,
      artist: item.artists.join(", ") || "Unknown artist",
      src: item.fileUrl,
      href: item.sourceUrl,
      onToggle: () => {
        void controlRef.current(roomPlayingRef.current ? "pause" : "play", item.id).catch((cause) =>
          setError(cause instanceof Error ? cause.message : "Could not update playback"),
        );
      },
      onClose: () => {
        dismissedItemIdRef.current = item.id;
        void controlRef.current("pause", item.id).catch(() => undefined);
      },
    };
    setPlaybackBlocked(false);
    playerRef.current.playTrack(track, {
      autoplay: roomPlayingRef.current,
      onEnded: () => {
        dismissedItemIdRef.current = null;
        void controlRef.current("skip", item.id).catch((cause) =>
          setError(cause instanceof Error ? cause.message : "Could not skip the finished track"),
        );
      },
    }).catch(() => setPlaybackBlocked(true));
  }, [snapshot?.room.currentItemId, snapshot?.room.isPlaying, snapshot?.nowPlaying?.fileUrl, snapshot?.nowPlaying?.sourceUrl, snapshot?.nowPlaying?.title, artistsKey]);

  async function queueUrl(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/vibe/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "This link could not be queued");
      setSnapshot(data);
      setUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This link could not be queued");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(itemId: string) {
    try {
      const response = await fetch(`/api/vibe/queue/${encodeURIComponent(itemId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not remove this track");
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this track");
    }
  }

  async function removePlaylist(playlistId: string) {
    try {
      const response = await fetch(`/api/vibe/playlists/${encodeURIComponent(playlistId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not remove this playlist");
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this playlist");
    }
  }

  async function updatePlaylistCover(playlistId: string, file: File) {
    const body = new FormData();
    body.append("cover", file);
    const response = await fetch(`/api/vibe/playlists/${encodeURIComponent(playlistId)}`, { method: "PATCH", body });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Could not update this cover");
    setSnapshot(data);
  }

  const nowPlaying = snapshot?.nowPlaying;
  const currentId = snapshot?.room.currentItemId || undefined;
  const groups = React.useMemo(() => groupQueue(snapshot?.playlists || [], snapshot?.queue || []), [snapshot?.playlists, snapshot?.queue]);
  const nowPlayingCover =
    (nowPlaying && groups.find((group) => group.items.some((item) => item.id === nowPlaying.id))?.playlist?.cover) ||
    (nowPlaying?.playlistId && snapshot?.playlists.find((playlist) => playlist.id === nowPlaying.playlistId)?.cover) ||
    nowPlaying?.cover ||
    null;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/[.06] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-violet-400">Shared room · main</p>
          <h1 className="font-mono text-[30px] leading-tight tracking-tight text-zinc-100 sm:text-[36px]">Vibe, together.</h1>
          <p className="mt-2 max-w-xl font-mono text-[11px] leading-6 text-zinc-500">
            Paste a track or playlist. Playlists become named shelves first, then downloads land inside them.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.14em] text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> shared state
        </div>
      </header>

      <form onSubmit={queueUrl} className="mb-6 rounded-2xl border border-white/[.08] bg-white/[.025] p-3 shadow-2xl shadow-black/10 sm:flex sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
          <Link2 className="h-4 w-4 shrink-0 text-violet-300" />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a track or playlist link"
            className="min-w-0 flex-1 bg-transparent py-3 font-mono text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700"
            aria-label="Music link"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-400/[.16] px-5 font-mono text-[10px] text-violet-200 transition hover:bg-violet-400/[.24] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto"
        >
          {submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
          {submitting ? "Preparing audio" : "Add to vibe"}
        </button>
      </form>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 font-mono text-[10px] leading-5 text-rose-200">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error"><X className="h-3.5 w-3.5 text-rose-300/70" /></button>
        </div>
      )}

      {loading ? (
        <LoadingVibe />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          <section className="rounded-2xl border border-white/[.07] bg-white/[.018]" aria-label="Vibe queue">
            <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.14em] text-zinc-500">Room shelves</p>
                <p className="mt-1 font-mono text-[9px] text-zinc-700">
                  {snapshot?.playlists.length || 0} playlist{(snapshot?.playlists.length || 0) === 1 ? "" : "s"} · {snapshot?.queue.length || 0} track{(snapshot?.queue.length || 0) === 1 ? "" : "s"}
                </p>
              </div>
              {snapshot?.queue.length ? (
                <button
                  onClick={() => void sendControl("clear").catch((cause) => setError(cause instanceof Error ? cause.message : "Could not clear the queue"))}
                  className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 transition hover:text-rose-300"
                >
                  Clear all
                </button>
              ) : null}
            </div>

            {groups.length ? (
              <div className="grid items-stretch gap-4 p-4 sm:grid-cols-2">
                {groups.map((group) => (
                  <PlaylistShelf
                    key={group.id}
                    group={group}
                    currentId={currentId}
                    onOpen={() => openShelf(group.id)}
                    onRemovePlaylist={group.playlist ? () => void removePlaylist(group.playlist!.id) : undefined}
                    onCoverChange={group.playlist ? (file) => updatePlaylistCover(group.playlist!.id, file).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update this cover")) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="px-6 py-20 text-center">
                <Headphones className="mx-auto h-7 w-7 text-zinc-700" />
                <p className="mt-4 font-mono text-xs text-zinc-500">The room is quiet.</p>
                <p className="mt-2 font-mono text-[10px] text-zinc-700">Add a track or playlist link and it will appear here.</p>
              </div>
            )}
          </section>

          <section className="h-fit rounded-2xl border border-violet-300/15 bg-[radial-gradient(circle_at_top,rgba(139,116,235,.12),transparent_62%)] p-5" aria-label="Now playing">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[.14em] text-violet-300/80">Now playing</p>
              <span className="font-mono text-[9px] text-zinc-600">{snapshot?.room.isPlaying ? "live" : "paused"}</span>
            </div>
            {nowPlaying ? (
              <>
                <div className="flex gap-4">
                  {nowPlayingCover ? (
                    <img src={nowPlayingCover} alt="" className="h-20 w-20 rounded-xl border border-white/10 object-cover" />
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04]">
                      <Headphones className="h-6 w-6 text-zinc-600" />
                    </div>
                  )}
                  <div className="min-w-0 pt-1">
                    <h2 className="truncate font-mono text-sm text-zinc-100">{nowPlaying.title}</h2>
                    <p className="mt-2 truncate font-mono text-[10px] text-zinc-500">{nowPlaying.artists.join(", ") || "Unknown artist"}</p>
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-violet-300/70">{statusLabel(nowPlaying.status)}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={() => void sendControl(snapshot.room.isPlaying ? "pause" : "play", nowPlaying.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update playback"))}
                    className="grid h-11 w-11 place-items-center rounded-full border border-violet-300/40 text-violet-200"
                    aria-label={snapshot.room.isPlaying ? "Pause vibe" : "Play vibe"}
                  >
                    {snapshot.room.isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                  </button>
                  <button
                    onClick={() => void sendControl("skip", nowPlaying.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not skip this track"))}
                    className="flex h-11 items-center gap-2 rounded-xl border border-white/[.08] px-4 font-mono text-[10px] text-zinc-400 transition hover:text-zinc-100"
                    aria-label="Skip current track"
                  >
                    <SkipForward className="h-3.5 w-3.5" /> Skip
                  </button>
                </div>
                {playbackBlocked && (
                  <p className="mt-4 font-mono text-[9px] leading-5 text-amber-200/70">
                    This browser blocked autoplay. Press play once to start the shared audio here.
                  </p>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <Radio className="mx-auto h-6 w-6 text-zinc-700" />
                <p className="mt-4 font-mono text-xs text-zinc-500">Nothing is playing yet.</p>
                <p className="mt-2 font-mono text-[10px] leading-5 text-zinc-700">When an audio file finishes, the next ready track starts for the room.</p>
              </div>
            )}
          </section>
        </div>
      )}
      {openShelfId ? (
        <PlaylistShelfModal
          group={groups.find((group) => group.id === openShelfId) || null}
          currentId={currentId}
          onClose={closeShelf}
          onSelect={(itemId) => void sendControl("select", itemId).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not play this track"))}
          onRemoveItem={(itemId) => void removeItem(itemId)}
        />
      ) : null}
      <p className="mt-6 text-center font-mono text-[9px] leading-5 text-zinc-700">
        Playback is served from Unstream-finished audio through the shared room relay. Browser autoplay rules may require one click per device.
      </p>
    </div>
  );
}

type VibeAction = "play" | "pause" | "skip" | "clear" | "select";

type QueueGroup = {
  id: string;
  playlist: VibePlaylistPayload | null;
  items: VibeQueuePayload[];
};

function groupQueue(playlists: VibePlaylistPayload[], queue: VibeQueuePayload[]): QueueGroup[] {
  const byPlaylist = new Map(playlists.map((playlist) => [playlist.id, playlist]));
  const groups: QueueGroup[] = playlists.map((playlist) => ({
    id: playlist.id,
    playlist,
    items: queue.filter((item) => item.playlistId === playlist.id),
  }));
  const singles = queue.filter((item) => !item.playlistId || !byPlaylist.has(item.playlistId));
  if (singles.length) groups.push({ id: "singles", playlist: null, items: singles });
  return groups.filter((group) => group.items.length > 0 || group.playlist);
}

function PlaylistShelf({
  group,
  currentId,
  onOpen,
  onRemovePlaylist,
  onCoverChange,
}: {
  group: QueueGroup;
  currentId?: string;
  onOpen: () => void;
  onRemovePlaylist?: () => void;
  onCoverChange?: (file: File) => void | Promise<void>;
}) {
  const playlist = group.playlist;
  const label = playlist?.name || "Singles";
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const activeCount = group.items.filter((item) => item.id === currentId).length;

  async function handleCover(file: File | undefined) {
    if (!file || !onCoverChange) return;
    setUploadingCover(true);
    try {
      await onCoverChange(file);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  return (
    <section
      aria-label={label}
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[.07] bg-white/[.02] transition hover:border-white/[.12]"
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="relative shrink-0">
          {playlist?.cover ? (
            <img src={playlist.cover} alt="" className="h-12 w-12 rounded-lg border border-white/10 object-cover shadow-lg shadow-black/30" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[.1]">
              <Disc3 className="h-5 w-5 text-violet-300/80" />
            </div>
          )}
          {onCoverChange ? (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(event) => void handleCover(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 text-zinc-100 opacity-0 transition hover:opacity-100 disabled:opacity-70"
                aria-label={`Change cover for ${label}`}
              >
                {uploadingCover ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              </button>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition hover:opacity-90"
          aria-haspopup="dialog"
          aria-label={`Open ${label} tracks`}
        >
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-mono text-[8px] uppercase tracking-[.16em] text-violet-300/70">
              {playlist ? (playlist.kind === "album" ? "Album" : "Playlist") : "Singles"}
              {activeCount ? " · playing" : ""}
            </p>
            <h3 className="mt-1 truncate font-sans text-sm font-medium tracking-tight text-zinc-100">{label}</h3>
            <p className="mt-1 truncate font-mono text-[9px] text-zinc-500">
              {playlist?.owner ? `${playlist.owner} · ` : ""}
              {playlist ? `${playlist.readyCount}/${playlist.trackCount} ready` : `${group.items.length} track${group.items.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />
        </button>
        {onRemovePlaylist ? (
          <button
            type="button"
            onClick={onRemovePlaylist}
            className="mt-0.5 rounded-md p-2 text-zinc-700 transition hover:bg-white/[.05] hover:text-rose-300"
            aria-label={`Remove playlist ${label}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function PlaylistShelfModal({
  group,
  currentId,
  onClose,
  onSelect,
  onRemoveItem,
}: {
  group: QueueGroup | null;
  currentId?: string;
  onClose: () => void;
  onSelect: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  React.useEffect(() => {
    if (!group) {
      onClose();
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [group, onClose]);

  if (!group) return null;
  const playlist = group.playlist;
  const label = playlist?.name || "Singles";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close playlist"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`shelf-modal-${group.id}`}
        className="relative z-10 flex max-h-[min(82vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-[#101118] shadow-[0_30px_80px_rgba(0,0,0,.55)]"
      >
        <div className="flex items-start gap-3 border-b border-white/[.06] p-4">
          {playlist?.cover ? (
            <img src={playlist.cover} alt="" className="h-14 w-14 rounded-xl border border-white/10 object-cover" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/[.1]">
              <Disc3 className="h-6 w-6 text-violet-300/80" />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-mono text-[8px] uppercase tracking-[.16em] text-violet-300/70">
              {playlist ? (playlist.kind === "album" ? "Album" : "Playlist") : "Singles"}
            </p>
            <h2 id={`shelf-modal-${group.id}`} className="mt-1 truncate font-sans text-base font-medium text-zinc-50">
              {label}
            </h2>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">
              {playlist?.owner ? `${playlist.owner} · ` : ""}
              {group.items.length} track{group.items.length === 1 ? "" : "s"}
              {playlist ? ` · ${playlist.readyCount} ready` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[.05] hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {group.items.length ? (
          <ol className="min-h-0 flex-1 divide-y divide-white/[.04] overflow-y-auto">
            {group.items.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                active={item.id === currentId}
                onSelect={() => onSelect(item.id)}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </ol>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-mono text-xs text-zinc-500">No tracks in this shelf yet.</p>
            <p className="mt-2 font-mono text-[10px] text-zinc-700">Downloads will land here when they finish.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueRow({ item, active, onSelect, onRemove }: { item: VibeQueuePayload; active: boolean; onSelect: () => void; onRemove: () => void }) {
  const playable = item.status === "ready" || item.status === "playing";
  return (
    <li className={`flex items-center gap-2 px-4 py-3 transition ${active ? "bg-violet-400/[.06]" : ""}`}>
      <span className="w-5 shrink-0 text-center font-mono text-[8px] text-zinc-700">
        {active ? <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-violet-300" /> : item.position + 1}
      </span>
      <button
        type="button"
        onClick={playable ? onSelect : undefined}
        disabled={!playable}
        className={`min-w-0 flex-1 truncate text-left font-mono text-[11px] transition ${active ? "text-violet-100" : "text-zinc-300"} ${playable ? "cursor-pointer hover:opacity-90" : "cursor-default opacity-70"}`}
        aria-label={playable ? `Play ${item.title}` : `${item.title} is not ready yet`}
        title={item.title}
      >
        {item.title}
      </button>
      {playable && !active ? (
        <button type="button" onClick={onSelect} className="rounded-md p-1.5 text-zinc-600 transition hover:bg-white/[.05] hover:text-violet-200" aria-label={`Play ${item.title}`}>
          <Play className="h-3 w-3 fill-current" />
        </button>
      ) : null}
      <button type="button" onClick={onRemove} className="rounded-md p-1.5 text-zinc-700 transition hover:bg-white/[.05] hover:text-rose-300" aria-label={`Remove ${item.title}`}>
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

function statusLabel(status: string) {
  if (status === "resolving") return "resolving";
  if (status === "downloading") return "downloading";
  if (status === "playing") return "playing";
  if (status === "failed") return "failed";
  return "ready";
}

function LoadingVibe() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <div className="h-96 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.02]" />
      <div className="h-72 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.02]" />
    </div>
  );
}
