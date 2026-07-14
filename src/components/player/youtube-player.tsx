"use client";
import * as React from "react";

type YouTubeInstance = { loadVideoById(id: string): void; cueVideoById(id: string): void; playVideo(): void; pauseVideo(): void; destroy(): void; getIframe(): HTMLIFrameElement };
type YouTubeApi = { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubeInstance };
declare global { interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void } }
let apiPromise: Promise<YouTubeApi> | null = null;
function loadApi() {
  if (window.YT) return Promise.resolve(window.YT);
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => window.YT ? resolve(window.YT) : reject(new Error("YouTube API unavailable"));
    const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true; script.onerror = () => reject(new Error("YouTube API unavailable")); document.head.appendChild(script);
  });
  return apiPromise;
}

export function YouTubePlayer({ videoId, playing, onPlayingChange, onUnavailable }: { videoId: string; playing: boolean; onPlayingChange: (value: boolean) => void; onUnavailable: () => void }) {
  const host = React.useRef<HTMLDivElement>(null); const player = React.useRef<YouTubeInstance | null>(null); const loadedId = React.useRef(""); const initialVideoId = React.useRef(videoId); const playingRef = React.useRef(playing); const callbacks = React.useRef({ onPlayingChange, onUnavailable });
  playingRef.current = playing; callbacks.current = { onPlayingChange, onUnavailable };
  React.useEffect(() => { let active = true; loadApi().then((YT) => { if (!active || !host.current || player.current) return; player.current = new YT.Player(host.current, { videoId: initialVideoId.current, host: "https://www.youtube-nocookie.com", playerVars: { playsinline: 1, origin: window.location.origin }, events: { onReady: () => { const iframe = player.current?.getIframe(); iframe?.setAttribute("referrerpolicy", "strict-origin-when-cross-origin"); loadedId.current = initialVideoId.current; if (playingRef.current) player.current?.playVideo(); }, onStateChange: (event: { data: number }) => { if (event.data === 1) callbacks.current.onPlayingChange(true); if (event.data === 0 || event.data === 2) callbacks.current.onPlayingChange(false); }, onError: () => callbacks.current.onUnavailable() } }); }).catch(() => callbacks.current.onUnavailable()); return () => { active = false; player.current?.destroy(); player.current = null; }; }, []); // one instance for this provider session
  React.useEffect(() => { if (!player.current || loadedId.current === videoId) return; loadedId.current = videoId; if (playing) player.current.loadVideoById(videoId); else player.current.cueVideoById(videoId); }, [videoId, playing]);
  React.useEffect(() => { if (playing) player.current?.playVideo(); else player.current?.pauseVideo(); }, [playing]);
  return <div className="aspect-video w-full bg-black" ref={host} />;
}
