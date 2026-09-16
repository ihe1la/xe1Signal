"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const AudioPlayerControls = dynamic(() => import("./audio-player-controls").then((module) => module.AudioPlayerControls), { ssr: false });

export type AudioTrack = {
  id: string;
  signalId?: string;
  title: string;
  artist?: string;
  src: string;
  href?: string;
  onToggle?: () => void;
  onClose?: () => void;
};

type AudioPlayerValue = {
  current: AudioTrack | null;
  playing: boolean;
  progress: number;
  duration: number;
  playTrack: (track: AudioTrack, options?: { autoplay?: boolean; onEnded?: () => void }) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => void;
};

const AudioPlayerContext = React.createContext<AudioPlayerValue | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = React.useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = React.useState<AudioTrack | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);
  const [muted, setMuted] = React.useState(false);
  const onEndedRef = React.useRef<(() => void) | undefined>(undefined);

  React.useEffect(() => {
    const saved = Number(window.localStorage.getItem("signal-audio-volume"));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) setVolume(saved);
  }, []);

  React.useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);
  React.useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);
  React.useEffect(() => { const pauseForMedia = () => audio.current?.pause(); window.addEventListener("signal:media-play", pauseForMedia); return () => window.removeEventListener("signal:media-play", pauseForMedia); }, []);

  async function playTrack(track: AudioTrack, options: { autoplay?: boolean; onEnded?: () => void } = {}) {
    const autoplay = options.autoplay ?? true;
    onEndedRef.current = options.onEnded;
    window.dispatchEvent(new Event("signal:audio-play"));
    const player = audio.current;
    if (!player) return;
    if (current?.src === track.src) {
      setCurrent(track);
      if (autoplay) {
        if (player.paused) { await player.play(); setPlaying(true); }
        else setPlaying(true);
      } else {
        player.pause(); setPlaying(false);
      }
      return;
    }
    setCurrent(track); setProgress(0); setDuration(0);
    player.src = track.src;
    player.load();
    if (!autoplay) { setPlaying(false); return; }
    try {
      await player.play();
      setPlaying(true);
    } catch (error) {
      setPlaying(false);
      throw error;
    }
  }

  async function toggle() {
    const player = audio.current;
    if (!player || !current) return;
    if (current.onToggle) { current.onToggle(); return; }
    if (player.paused) { await player.play(); setPlaying(true); }
    else { player.pause(); setPlaying(false); }
  }

  function close() {
    const closing = current;
    const player = audio.current;
    if (player) { player.pause(); player.removeAttribute("src"); player.load(); }
    onEndedRef.current = undefined;
    setCurrent(null); setPlaying(false); setProgress(0); setDuration(0);
    closing?.onClose?.();
  }

  return <AudioPlayerContext.Provider value={{ current, playing, progress, duration, playTrack, toggle, stop: close }}>
    {children}
    <audio ref={audio} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setProgress(event.currentTarget.duration ? event.currentTarget.currentTime / event.currentTarget.duration : 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(0); onEndedRef.current?.(); }} />
    {current && <AudioPlayerControls current={current} playing={playing} progress={progress} duration={duration} volume={volume} muted={muted} toggle={toggle} close={close} setVolume={setVolume} setMuted={setMuted} seek={(value) => { const player = audio.current; if (player?.duration) player.currentTime = value * player.duration; }} />}
  </AudioPlayerContext.Provider>;
}

export function useAudioPlayer() {
  const value = React.useContext(AudioPlayerContext);
  if (!value) throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  return value;
}
