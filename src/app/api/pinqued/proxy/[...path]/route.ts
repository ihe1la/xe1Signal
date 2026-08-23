import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
type Context = { params: Promise<{ path: string[] }> };
const PINQUED_EXTERNAL_BASE = "https://01x.site/api/v1/external";
const RESOURCES = new Set(["snippets", "relays", "stashes", "files", "terminal"]);

function allowed(path: string[]) {
  return Boolean(path[0] && RESOURCES.has(path[0]));
}

async function proxy(request: Request, context: Context) {
  const session = await auth();
  if (!canAccessOwnerTools(session?.user?.username)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { path } = await context.params;
  if (!allowed(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const apiKey = process.env.PINQUED_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Pinqued API is not configured" }, { status: 503 });

  try {
    const headers: Record<string, string> = { accept: request.headers.get("accept") || "application/json", authorization: `Bearer ${apiKey}` };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;
    const incomingUrl = new URL(request.url);
    const upstream = await fetch(`${PINQUED_EXTERNAL_BASE}/${path.map(encodeURIComponent).join("/")}${incomingUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const body = upstream.status === 204 ? null : upstream.body;
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
        ...(upstream.headers.get("content-disposition") ? { "content-disposition": upstream.headers.get("content-disposition") as string } : {}),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pinqued is unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
