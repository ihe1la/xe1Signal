import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";

type Context = { params: Promise<{ path: string[] }> };
const UPSTREAM = "https://l30on.top";
const PROXY_PREFIX = "/api/th3l30";

function rewriteText(value: string) {
  return value
    .replaceAll(UPSTREAM, PROXY_PREFIX)
    .replace(/(["'`(=])\/(?!\/|api\/th3l30(?:\/|["'`]))/g, `$1${PROXY_PREFIX}/`);
}

async function proxy(request: Request, context: Context) {
  const session = await auth();
  if (!canAccessOwnerTools(session?.user?.username)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const upstreamSession = process.env.TH3L30_SESSION;
  const upstreamKey = process.env.TH3L30_OH_SHIT;
  if (!upstreamSession || !upstreamKey) return NextResponse.json({ error: "th3l30 is not configured" }, { status: 503 });

  const { path } = await context.params;
  const incoming = new URL(request.url);
  const trailingSlash = incoming.pathname.endsWith("/") ? "/" : "";
  const upstreamUrl = `${UPSTREAM}/${path.map(encodeURIComponent).join("/")}${trailingSlash}${incoming.search}`;
  const headers: Record<string, string> = {
    accept: request.headers.get("accept") || "*/*",
    "accept-language": request.headers.get("accept-language") || "en-US,en;q=0.9",
    cookie: `l30_session=${upstreamSession}; oh-shit=${upstreamKey}`,
    origin: UPSTREAM,
    referer: `${UPSTREAM}/dashboard/`,
    "user-agent": request.headers.get("user-agent") || "Mozilla/5.0",
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const location = upstream.headers.get("location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      const resolved = new URL(location, UPSTREAM);
      const response = NextResponse.redirect(new URL(`${PROXY_PREFIX}${resolved.pathname}${resolved.search}`, request.url), upstream.status);
      response.headers.set("cache-control", "no-store");
      return response;
    }

    const responseType = upstream.headers.get("content-type") || "application/octet-stream";
    if (responseType.includes("text/event-stream")) {
      return new NextResponse(upstream.body, { status: upstream.status, headers: { "content-type": responseType, "cache-control": "no-store" } });
    }

    if (responseType.includes("text/html") || responseType.includes("text/css") || responseType.includes("javascript")) {
      let body = rewriteText(await upstream.text());
      if (responseType.includes("text/html")) {
        const bootstrap = `<script>localStorage.setItem("l30_session",${JSON.stringify(upstreamSession)});localStorage.setItem("oh-shit",${JSON.stringify(upstreamKey)});</script>`;
        body = body.includes("</head>") ? body.replace("</head>", `${bootstrap}</head>`) : `${bootstrap}${body}`;
      }
      return new NextResponse(body, { status: upstream.status, headers: { "content-type": responseType, "cache-control": "no-store" } });
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers: { "content-type": responseType, "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "th3l30 is unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

