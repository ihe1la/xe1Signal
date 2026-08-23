import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import {
  mergePinquedCookies,
  PINQUED_ORIGIN,
  pinquedCookieHeader,
  readPinquedCookies,
  storePinquedCookies,
} from "@/lib/pinqued-upstream";

export async function POST() {
  const session = await auth();
  if (!canAccessOwnerTools(session?.user?.username)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jar = await readPinquedCookies();
  if (!Object.keys(jar).length) return NextResponse.json({ error: "Connect to Pinqued again" }, { status: 401 });

  try {
    const upstream = await fetch(`${PINQUED_ORIGIN}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { accept: "application/json", cookie: pinquedCookieHeader(jar) },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    mergePinquedCookies(jar, upstream.headers);
    const data = await upstream.json().catch(() => ({})) as Record<string, unknown>;
    const token = typeof data.accessToken === "string" ? data.accessToken : typeof data.token === "string" ? data.token : null;
    if (!upstream.ok || !token) return NextResponse.json({ error: "Connect to Pinqued again" }, { status: 401 });
    const response = NextResponse.json({ accessToken: token });
    storePinquedCookies(response, jar);
    return response;
  } catch {
    return NextResponse.json({ error: "Pinqued is unavailable" }, { status: 502 });
  }
}

