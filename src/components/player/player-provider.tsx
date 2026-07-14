"use client";
import * as React from "react";
import type { PlayerItem, PlayerState } from "./player-types";
import { GlobalPlayer } from "./global-player";

type PlayerContextValue = PlayerState & {
  play: (item: PlayerItem) => void; toggle: () => void; close: () => void; next: () => void; previous: () => void;
  addToQueue: (item: PlayerItem) => void; removeFromQueue: (signalId: string) => void; clearQueue: () => void;
};
const PlayerContext = React.createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PlayerState>({ current: null, queue: [], isOpen: false, isPlaying: false });
  React.useEffect(() => { const pauseForAudio = () => setState((value) => ({ ...value, isPlaying: false })); window.addEventListener("signal:audio-play", pauseForAudio); return () => window.removeEventListener("signal:audio-play", pauseForAudio); }, []);
  const play = React.useCallback((item: PlayerItem) => { window.dispatchEvent(new Event("signal:media-play")); setState((value) => ({ ...value, current: item, isOpen: true, isPlaying: true, queue: value.queue.some((queued) => queued.signalId === item.signalId) ? value.queue : [...value.queue, item] })); }, []);
  const toggle = React.useCallback(() => setState((value) => ({ ...value, isPlaying: !value.isPlaying })), []);
  const close = React.useCallback(() => setState((value) => ({ ...value, current: null, isOpen: false, isPlaying: false })), []);
  const move = React.useCallback((offset: number) => setState((value) => {
    if (!value.current || value.queue.length < 2) return value;
    const index = value.queue.findIndex((item) => item.signalId === value.current?.signalId);
    const current = value.queue[(index + offset + value.queue.length) % value.queue.length];
    return { ...value, current, isPlaying: true, isOpen: true };
  }), []);
  const context = React.useMemo<PlayerContextValue>(() => ({ ...state, play, toggle, close, next: () => move(1), previous: () => move(-1), addToQueue: (item) => setState((value) => value.queue.some((queued) => queued.signalId === item.signalId) ? value : { ...value, queue: [...value.queue, item] }), removeFromQueue: (signalId) => setState((value) => ({ ...value, queue: value.queue.filter((item) => item.signalId !== signalId) })), clearQueue: () => setState((value) => ({ ...value, queue: [] })) }), [state, play, toggle, close, move]);
  return <PlayerContext.Provider value={context}>{children}<GlobalPlayer /></PlayerContext.Provider>;
}

export function usePlayer() {
  const value = React.useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}
