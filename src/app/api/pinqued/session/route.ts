import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import {
  clearPinquedCookies,
  fetchPinquedCsrf,
  mergePinquedCookies,
  PINQUED_ORIGIN,
  pinquedCookieHeader,
  storePinquedCookies,
  type PinquedCookieJar,
} from "@/lib/pinqued-upstream";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(500),
});

async function ownerOnly() {
  const session = await auth();
  return canAccessOwnerTools(session?.user?.username);
}

export async function POST(request: Request) {
  if (!await ownerOnly()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your Pinqued login" }, { status: 400 });

  try {
    const jar: PinquedCookieJar = {};
    const csrfToken = await fetchPinquedCsrf(jar);
    const upstream = await fetch(`${PINQUED_ORIGIN}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
        cookie: pinquedCookieHeader(jar),
      },
      body: JSON.stringify({ ...parsed.data, clientUserAgent: request.headers.get("user-agent") || undefined }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    mergePinquedCookies(jar, upstream.headers);
    const data = await upstream.json().catch(() => ({})) as Record<string, unknown>;
    const token = typeof data.accessToken === "string" ? data.accessToken : typeof data.token === "string" ? data.token : null;
    if (!upstream.ok || !token) {
      const message = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : "Pinqued login failed";
      return NextResponse.json({ error: message }, { status: upstream.status || 401 });
    }
    const response = NextResponse.json({ accessToken: token });
    storePinquedCookies(response, jar);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pinqued is unavailable" }, { status: 502 });
  }
}

export async function DELETE() {
  if (!await ownerOnly()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = NextResponse.json({ ok: true });
  clearPinquedCookies(response);
  return response;
}

