"use client";

import * as React from "react";

type PinquedContextValue = {
  connected: boolean;
  request: (path: string, init?: RequestInit) => Promise<Response>;
};

const PinquedContext = React.createContext<PinquedContextValue | null>(null);

export function usePinqued() {
  const context = React.useContext(PinquedContext);
  if (!context) throw new Error("usePinqued must be used inside PinquedSession");
  return context;
}

export function PinquedSession({ children }: { children: React.ReactNode }) {
  const request = React.useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (init.body && typeof init.body === "string" && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return fetch(`/api/pinqued/proxy/${path.replace(/^\/+/, "")}`, {
      ...init,
      headers,
    });
  }, []);

  return (
    <PinquedContext.Provider value={{ connected: true, request }}>
      {children}
    </PinquedContext.Provider>
  );
}
