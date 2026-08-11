"use client";

import * as React from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { Loader2, Square, TerminalSquare } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

type Status = "idle" | "connecting" | "open" | "closed" | "error";

export function TerminalWorkspace() {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const fitRef = React.useRef<FitAddon | null>(null);
  const socketRef = React.useRef<WebSocket | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const disconnect = React.useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setStatus((current) => (current === "open" || current === "connecting" ? "closed" : current));
  }, []);

  const connect = React.useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const response = await fetch("/api/terminal/ticket", { method: "POST" });
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Not available" : "Could not open terminal ticket");
      }
      const data = (await response.json()) as { ticket: string; wsPath: string };
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${proto}://${window.location.host}${data.wsPath}?ticket=${encodeURIComponent(data.ticket)}`,
      );
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        const term = termRef.current;
        const fit = fitRef.current;
        if (term && fit) {
          fit.fit();
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      };
      ws.onmessage = (event) => {
        termRef.current?.write(typeof event.data === "string" ? event.data : new Uint8Array(event.data));
      };
      ws.onerror = () => {
        setError("WebSocket error — is the terminal service running?");
        setStatus("error");
      };
      ws.onclose = () => {
        setStatus("closed");
        socketRef.current = null;
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    if (!hostRef.current || termRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: "#08090d",
        foreground: "#e4e4e7",
        cursor: "#c4b5fd",
        selectionBackground: "rgba(139,92,246,.35)",
        black: "#09090b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e4e4e7",
        brightBlack: "#71717a",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#fafafa",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(hostRef.current);
    fit.fit();
    term.focus();
    termRef.current = term;
    fitRef.current = fit;

    const onData = term.onData((data) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(data);
      }
    });

    const onResize = () => {
      fit.fit();
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    };
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(hostRef.current);

    void connect();

    return () => {
      onData.dispose();
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [connect, disconnect]);

  return (
    <div aria-label="Root terminal" className="mx-auto max-w-[1100px]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[.14em] text-violet-300/85">Owner terminal</p>
          <p className="mt-1 max-w-xl font-sans text-sm text-zinc-500">
            Root shell on this VPS over HTTPS — no TUN / local SSH proxy needed. Owner-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-500">
            {status === "connecting"
              ? "connecting…"
              : status === "open"
                ? "connected"
                : status === "error"
                  ? "error"
                  : "disconnected"}
          </span>
          {status === "open" ? (
            <button
              type="button"
              onClick={disconnect}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[.08] px-3 font-sans text-xs text-zinc-400 transition hover:border-rose-400/30 hover:text-rose-200"
            >
              <Square className="h-3.5 w-3.5" />
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void connect()}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/20 px-3 font-sans text-xs text-violet-100 transition hover:border-violet-300/50"
            >
              {status === "connecting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <TerminalSquare className="h-3.5 w-3.5" />
              )}
              Connect
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mb-3 font-sans text-[12px] text-rose-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-violet-400/20 bg-[#08090d] shadow-[0_18px_50px_rgba(0,0,0,.45)]">
        <div className="flex items-center gap-2 border-b border-white/[.06] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 font-mono text-[11px] text-zinc-500">root@he1l.me</span>
        </div>
        <div ref={hostRef} className="h-[min(70vh,620px)] w-full p-2" />
      </div>
    </div>
  );
}
