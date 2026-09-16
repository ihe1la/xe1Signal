"use client";

import * as React from "react";
import { useAudioPlayer } from "./audio-player-provider";
import { useVibe, type VibeAction } from "./vibe-provider";
import type { VibeQueuePayload, VibeSnapshot } from "@/lib/vibe-server";

export function VibeRuntime({ inRoom }: { inRoom: boolean }) {
  const { snapshot, setSnapshot, setError, setLoading, setPlaybackBlocked, sendControl, dismissedItemIdRef } = useVibe();
  const player = useAudioPlayer();
  const playerRef = React.useRef(player);
  const controlRef = React.useRef<(action: VibeAction, itemId?: string) => Promise<void>>(() => Promise.resolve());
  const nowPlayingRef = React.useRef<VibeQueuePayload | null>(null);
  const roomPlayingRef = React.useRef(false);
  const artistsKey = snapshot?.nowPlaying?.artists.join(", ") ?? "";
  playerRef.current = player;
  nowPlayingRef.current = snapshot?.nowPlaying || null;
  roomPlayingRef.current = snapshot?.room.isPlaying || false;

  controlRef.current = sendControl;
  const playingVibe = Boolean(player.current?.id.startsWith("vibe:") && player.playing);

  React.useEffect(() => {
    let source: EventSource | undefined;
    let fallbackPoll: number | undefined;
    let controller: AbortController | undefined;
    let generation = 0;
    let fetching = false;
    const stop = () => {
      generation += 1;
      source?.close();
      source = undefined;
      if (fallbackPoll !== undefined) window.clearInterval(fallbackPoll);
      fallbackPoll = undefined;
      controller?.abort();
      controller = undefined;
      fetching = false;
    };
    const start = () => {
      stop();
      if ((!inRoom || document.hidden) && !playingVibe) return;
      const currentGeneration = generation;
      const accept = (data: VibeSnapshot) => {
        if (generation !== currentGeneration) return;
        setSnapshot(data);
        setError(null);
        setLoading(false);
      };
      const load = async () => {
        if (fetching || generation !== currentGeneration) return;
        fetching = true;
        controller = new AbortController();
        try {
          const response = await fetch("/api/vibe", { cache: "no-store", signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || "Vibe state is unavailable");
          accept(data);
        } catch (cause) {
          if (generation === currentGeneration) {
            setError(cause instanceof Error ? cause.message : "Vibe state is unavailable");
            setLoading(false);
          }
        } finally {
          if (generation === currentGeneration) fetching = false;
        }
      };
      source = new EventSource("/api/vibe/events");
      source.addEventListener("vibe", (event) => {
        try { accept(JSON.parse(event.data)); }
        catch { void load(); }
      });
      source.onerror = () => {
        if (generation !== currentGeneration) return;
        source?.close();
        void load();
        if (fallbackPoll === undefined) fallbackPoll = window.setInterval(() => { void load(); }, 10_000);
      };
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", start);
    };
  }, [inRoom, playingVibe, setSnapshot, setError, setLoading]);

  React.useEffect(() => {
    const item = nowPlayingRef.current;
    if (!inRoom && !playerRef.current.current?.id.startsWith("vibe:")) return;
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

  return null;
}
