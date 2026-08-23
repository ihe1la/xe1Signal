"use client";

import * as React from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";

type PinquedContextValue = {
  connected: boolean;
  getToken: () => string | null;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  logout: () => Promise<void>;
};

const PinquedContext = React.createContext<PinquedContextValue | null>(null);
const TOKEN_KEY = "xe1signal-pinqued-access-token";

export function usePinqued() {
  const context = React.useContext(PinquedContext);
  if (!context) throw new Error("usePinqued must be used inside PinquedSession");
  return context;
}

export function PinquedSession({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_KEY));
    setReady(true);
  }, []);

  const rememberToken = React.useCallback((next: string | null) => {
    setToken(next);
    if (next) window.localStorage.setItem(TOKEN_KEY, next);
    else window.localStorage.removeItem(TOKEN_KEY);
  }, []);

  const refresh = React.useCallback(async () => {
    const response = await fetch("/api/pinqued/session/refresh", { method: "POST" });
    if (!response.ok) return null;
    const data = await response.json() as { accessToken?: string };
    if (!data.accessToken) return null;
    rememberToken(data.accessToken);
    return data.accessToken;
  }, [rememberToken]);

  const request = React.useCallback(async (path: string, init: RequestInit = {}) => {
    let activeToken = token;
    if (!activeToken) activeToken = await refresh();
    if (!activeToken) return new Response(JSON.stringify({ error: "Connect to Pinqued" }), { status: 401, headers: { "content-type": "application/json" } });
    const send = (value: string) => fetch(`/api/pinqued/proxy/${path.replace(/^\/+/, "")}`, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${value}` },
    });
    let response = await send(activeToken);
    if (response.status === 401) {
      const next = await refresh();
      if (next) response = await send(next);
      else rememberToken(null);
    }
    return response;
  }, [refresh, rememberToken, token]);

  const logout = React.useCallback(async () => {
    rememberToken(null);
    await fetch("/api/pinqued/session", { method: "DELETE" });
  }, [rememberToken]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/pinqued/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json() as { accessToken?: string; error?: string };
      if (!response.ok || !data.accessToken) throw new Error(data.error || "Pinqued login failed");
      rememberToken(data.accessToken);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pinqued login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="grid min-h-[620px] place-items-center text-[11px] text-[#77717e]">Connecting…</div>;

  if (!token) {
    return (
      <div className="grid min-h-[620px] place-items-center bg-[#09090c] p-6 font-mono">
        <form onSubmit={login} className="w-full max-w-sm border border-[#302d35] bg-[#0d0d11] p-5">
          <p className="text-[20px] text-[#f0ebf4]">/ login</p>
          <p className="mt-2 text-[10px] leading-5 text-[#817a87]">Connect your Pinqued account to use its Terminal and Stash here.</p>
          <input aria-label="Pinqued username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="mt-5 h-10 w-full border border-[#3a3740] bg-[#09090c] px-3 text-[11px] text-white outline-none focus:border-[#81758a]" />
          <input aria-label="Pinqued password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="mt-2 h-10 w-full border border-[#3a3740] bg-[#09090c] px-3 text-[11px] text-white outline-none focus:border-[#81758a]" />
          {error ? <p role="alert" className="mt-3 text-[10px] text-rose-300">{error}</p> : null}
          <button type="submit" disabled={busy || !username.trim() || !password} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 border border-[#62586b] bg-[#221b29] text-[10px] text-[#f0e8f3] disabled:opacity-40">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} Connect Pinqued
          </button>
          <p className="mt-3 text-[9px] leading-4 text-[#6f6975]">Your password is sent only to Pinqued for login and is not stored by he1l.me.</p>
        </form>
      </div>
    );
  }

  return (
    <PinquedContext.Provider value={{ connected: true, getToken: () => window.localStorage.getItem(TOKEN_KEY), request, logout }}>
      <div className="relative">
        {children}
        <button type="button" onClick={() => void logout()} title="Disconnect Pinqued" className="absolute right-2 top-2 inline-flex h-7 items-center gap-1.5 border border-[#302d35] bg-[#0d0d11] px-2 text-[9px] text-[#817a87] hover:text-white"><LogOut className="h-3 w-3" /> Disconnect</button>
      </div>
    </PinquedContext.Provider>
  );
}
