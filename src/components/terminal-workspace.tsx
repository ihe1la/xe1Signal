"use client";

import * as React from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { Loader2, Square, TerminalSquare } from "lucide-react";
import { usePinqued } from "@/components/pinqued-session";
import { pinquedError } from "@/lib/pinqued";
import "@xterm/xterm/css/xterm.css";

type Status = "idle" | "connecting" | "open" | "closed" | "error";

export function TerminalWorkspace() {
  const pinqued = usePinqued();
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

  const destroy = React.useCallback(async () => {
    disconnect();
    await pinqued.request("terminal/stop", { method: "POST" }).catch(() => undefined);
  }, [disconnect, pinqued]);

  const connect = React.useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const response = await pinqued.request("terminal/start", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(pinquedError(data, "Could not start Pinqued terminal"));
      }
      const ticketResponse = await fetch("/api/terminal/ticket", { method: "POST" });
      if (!ticketResponse.ok) throw new Error("Could not open terminal bridge");
      const ticket = await ticketResponse.json() as { ticket: string; wsPath: string };
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${window.location.host}${ticket.wsPath}?ticket=${encodeURIComponent(ticket.ticket)}`);
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
        setError("Pinqued terminal connection failed");
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
  }, [pinqued]);

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
    <div aria-label="Pinqued terminal" className="font-mono text-[#e9e3ee]">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Terminal</h1>
          <p className="mt-1 max-w-xl text-[11px] text-[#8a8390]">
            Live Pinqued container. Input is forwarded to 01x.site, not this machine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#8a8390]">
            {status === "connecting"
              ? "connecting…"
              : status === "open"
                ? "connected"
                : status === "error"
                  ? "error"
                  : "disconnected"}
          </span>
          {status === "open" ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={disconnect} className="inline-flex h-8 items-center gap-2 border border-[#494452] px-3 text-[10px] text-[#d7d0df] hover:text-white"><Square className="h-3.5 w-3.5" />Disconnect</button>
              <button type="button" onClick={() => void destroy()} className="h-8 border border-rose-400/20 px-3 text-[10px] text-rose-300 hover:border-rose-400/40">Destroy</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void connect()}
              className="inline-flex h-8 items-center gap-2 border border-[#776276] bg-[#2a2033] px-3 text-[10px] text-[#f0e4f4]"
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
        <p className="mb-3 text-[10px] text-rose-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden border border-[#2a2931] bg-[#08080b]">
        <div className="flex items-center gap-2 border-b border-[#2a2931] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-[11px] text-[#8a8390]">terminal@pinqued</span>
        </div>
        <div ref={hostRef} className="h-[min(70vh,620px)] w-full p-2" />
      </div>
    </div>
  );
}
