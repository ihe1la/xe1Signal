"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAudioPlayer } from "./audio-player-provider";
import type { VibeSnapshot } from "@/lib/vibe-server";

const VibeRuntime = dynamic(() => import("./vibe-runtime").then((module) => module.VibeRuntime), { ssr: false });
export type VibeAction = "play" | "pause" | "skip" | "clear" | "select";
type VibeContextValue = {
  snapshot: VibeSnapshot | null;
  setSnapshot: React.Dispatch<React.SetStateAction<VibeSnapshot | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  playbackBlocked: boolean;
  setPlaybackBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  dismissedItemIdRef: React.RefObject<string | null>;
  sendControl: (action: VibeAction, itemId?: string) => Promise<void>;
};
const VibeContext = React.createContext<VibeContextValue | null>(null);

export function VibeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const player = useAudioPlayer();
  const [snapshot, setSnapshot] = React.useState<VibeSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = React.useState(false);
  const dismissedItemIdRef = React.useRef<string | null>(null);
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
  }, [setSnapshot, setError]);
  const value = React.useMemo(() => ({ snapshot, setSnapshot, loading, setLoading, error, setError, playbackBlocked, setPlaybackBlocked, dismissedItemIdRef, sendControl }), [snapshot, loading, error, playbackBlocked, sendControl]);
  return <VibeContext.Provider value={value}>
    {children}
    {status === "authenticated" && (pathname === "/vibe" || player.current?.id.startsWith("vibe:")) && <VibeRuntime inRoom={pathname === "/vibe"} />}
  </VibeContext.Provider>;
}

export function useVibe() {
  const value = React.useContext(VibeContext);
  if (!value) throw new Error("useVibe must be used inside VibeProvider");
  return value;
}
