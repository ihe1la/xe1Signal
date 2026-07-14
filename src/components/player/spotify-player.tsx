"use client";
import * as React from "react";

type SpotifyController = { loadEntity(value: string): void; play(): void; pause(): void; addListener(name: string, callback: (event: { data?: { isPaused?: boolean } }) => void): void; destroy?(): void };
type SpotifyApi = { createController(element: HTMLElement, options: { uri: string; width?: string; height?: number }, callback: (controller: SpotifyController) => void): void };
declare global { interface Window { onSpotifyIframeApiReady?: (api: SpotifyApi) => void; SpotifyIframeApi?: SpotifyApi } }
let spotifyPromise: Promise<SpotifyApi> | null = null;
function loadSpotifyApi() {
  if (window.SpotifyIframeApi) return Promise.resolve(window.SpotifyIframeApi);
  if (!spotifyPromise) spotifyPromise = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => { window.SpotifyIframeApi = api; resolve(api); };
    const script = document.createElement("script"); script.src = "https://open.spotify.com/embed/iframe-api/v1"; script.async = true; script.onerror = () => reject(new Error("Spotify API unavailable")); document.head.appendChild(script);
  });
  return spotifyPromise;
}

export function SpotifyPlayer({ uri, playing, onPlayingChange, onUnavailable }: { uri: string; playing: boolean; onPlayingChange: (value: boolean) => void; onUnavailable: () => void }) {
  const host = React.useRef<HTMLDivElement>(null); const controller = React.useRef<SpotifyController | null>(null); const loadedUri = React.useRef(uri); const initialUri = React.useRef(uri); const playingRef = React.useRef(playing); const callbacks = React.useRef({ onPlayingChange, onUnavailable });
  playingRef.current = playing; callbacks.current = { onPlayingChange, onUnavailable };
  React.useEffect(() => { let active = true; loadSpotifyApi().then((api) => { if (!active || !host.current) return; api.createController(host.current, { uri: initialUri.current, width: "100%", height: 152 }, (created) => { if (!active) return; controller.current = created; loadedUri.current = initialUri.current; created.addListener("playback_update", (event) => { if (typeof event.data?.isPaused === "boolean") callbacks.current.onPlayingChange(!event.data.isPaused); }); if (playingRef.current) created.play(); }); }).catch(() => callbacks.current.onUnavailable()); return () => { active = false; controller.current?.destroy?.(); controller.current = null; }; }, []);
  React.useEffect(() => { if (!controller.current || loadedUri.current === uri) return; loadedUri.current = uri; controller.current.loadEntity(uri); if (playing) controller.current.play(); }, [uri, playing]);
  React.useEffect(() => { if (playing) controller.current?.play(); else controller.current?.pause(); }, [playing]);
  return <div className="min-h-[152px] w-full" ref={host} />;
}
