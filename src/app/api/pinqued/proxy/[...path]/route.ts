import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import {
  fetchPinquedCsrf,
  mergePinquedCookies,
  PINQUED_ORIGIN,
  pinquedCookieHeader,
  readPinquedCookies,
  storePinquedCookies,
} from "@/lib/pinqued-upstream";

type Context = { params: Promise<{ path: string[] }> };
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowed(path: string[]) {
  return path[0] === "stash" || (path[0] === "terminal" && (path[1] === "start" || path[1] === "stop") && path.length === 2);
}

async function proxy(request: Request, context: Context) {
  const session = await auth();
  if (!canAccessOwnerTools(session?.user?.username)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { path } = await context.params;
  if (!allowed(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Connect to Pinqued" }, { status: 401 });

  try {
    const jar = await readPinquedCookies();
    const headers: Record<string, string> = { accept: request.headers.get("accept") || "application/json", authorization };
    if (Object.keys(jar).length) headers.cookie = pinquedCookieHeader(jar);
    if (MUTATING.has(request.method)) {
      headers["x-csrf-token"] = await fetchPinquedCsrf(jar);
      headers.cookie = pinquedCookieHeader(jar);
    }
    const contentType = request.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;
    const incomingUrl = new URL(request.url);
    const upstream = await fetch(`${PINQUED_ORIGIN}/api/v1/${path.map(encodeURIComponent).join("/")}${incomingUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    mergePinquedCookies(jar, upstream.headers);
    const body = upstream.status === 204 ? null : await upstream.arrayBuffer();
    const response = new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
    if (Object.keys(jar).length) storePinquedCookies(response, jar);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pinqued is unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

