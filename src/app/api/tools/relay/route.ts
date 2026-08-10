import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertSafeUrl } from "@/lib/safe-url";

const schema = z.object({ url: z.string().url().max(2048) });
const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 3;

async function readText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error("Response is too large");
    }
    chunks.push(next.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid public URL" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid public URL" }, { status: 400 });

  try {
    let url = await assertSafeUrl(parsed.data.url);
    let response: Response | undefined;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: { accept: "text/plain, application/json, text/html;q=0.8" },
        signal: AbortSignal.timeout(Number(process.env.LINK_PREVIEW_TIMEOUT) || 5_000),
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Too many redirects");
      url = await assertSafeUrl(new URL(location, url).toString());
    }
    if (!response) throw new Error("No response");
    const contentType = response.headers.get("content-type") || "";
    const bodyText = contentType.includes("text/") || contentType.includes("json") || contentType.includes("xml")
      ? await readText(response)
      : `Binary response (${response.headers.get("content-length") || "unknown"} bytes)`;
    return NextResponse.json({ status: response.status, contentType, body: bodyText.slice(0, 20_000), url: url.toString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The request could not be relayed" }, { status: 422 });
  }
}
