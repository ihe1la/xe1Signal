import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  isAllowedMediaThumbnail,
  isSpotifyShortLink,
  parseMediaUrl,
  type ParsedMedia,
} from "@/lib/media/parse-media-url";
import { parseOEmbedMetadata } from "@/lib/media/provider-metadata";

export const runtime = "nodejs";
const inputSchema = z.object({ url: z.string().trim().min(1).max(2048) });
const cache = new Map<string, { expires: number; value: MediaPreview }>();
const MAX_RESPONSE_BYTES = 256_000;
type MediaPreview = ParsedMedia & {
  title: string | null;
  creator: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
};
const audiusResponseSchema = z.object({
  data: z.object({
    id: z.string().regex(/^[A-Za-z0-9]{4,64}$/),
    title: z.string().max(500),
    duration: z.number().nonnegative().max(86_400),
    user: z.object({ name: z.string().max(300) }),
    artwork: z.record(z.unknown()).nullable().optional(),
  }),
});

async function resolveSpotifyShortLink(value: string) {
  let current = new URL(value);
  for (let count = 0; count < 3; count++) {
    const response = await fetch(current, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(3500),
    });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) break;
    const next = new URL(location, current);
    if (
      next.protocol !== "https:" ||
      !["spotify.link", "open.spotify.com"].includes(
        next.hostname.toLowerCase(),
      )
    )
      throw new Error("Invalid redirect");
    current = next;
    if (current.hostname.toLowerCase() === "open.spotify.com")
      return current.toString();
  }
  throw new Error("Short link could not be resolved");
}

async function fetchProviderJson(url: string) {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(4000),
    headers: { accept: "application/json" },
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.toLowerCase().includes("json")
  )
    throw new Error("Metadata unavailable");
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_RESPONSE_BYTES) throw new Error("Metadata too large");
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Metadata too large");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(joined));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsedInput = inputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedInput.success)
    return NextResponse.json(
      { error: "Paste a valid YouTube, Spotify, or Audius URL" },
      { status: 400 },
    );
  try {
    const source = isSpotifyShortLink(parsedInput.data.url)
      ? await resolveSpotifyShortLink(parsedInput.data.url)
      : parsedInput.data.url;
    const media = parseMediaUrl(source);
    if (!media)
      return NextResponse.json(
        { error: "This YouTube, Spotify, or Audius URL is not supported" },
        { status: 400 },
      );
    const cached = cache.get(media.canonicalUrl);
    if (cached && cached.expires > Date.now())
      return NextResponse.json(cached.value);

    if (media.provider === "audius") {
      const parsed = audiusResponseSchema.safeParse(
        await fetchProviderJson(
          `https://api.audius.co/v1/resolve?url=${encodeURIComponent(media.canonicalUrl)}`,
        ),
      );
      if (!parsed.success) throw new Error("Audius metadata unavailable");
      const artwork = parsed.data.data.artwork;
      const thumbnail =
        typeof artwork?.["480x480"] === "string"
          ? artwork["480x480"]
          : typeof artwork?.["150x150"] === "string"
            ? artwork["150x150"]
            : null;
      const value: MediaPreview = {
        ...media,
        externalId: parsed.data.data.id,
        title: parsed.data.data.title,
        creator: parsed.data.data.user.name,
        thumbnailUrl:
          thumbnail && isAllowedMediaThumbnail(thumbnail, "audius")
            ? thumbnail
            : null,
        durationMs: Math.round(parsed.data.data.duration * 1000),
      };
      cache.set(media.canonicalUrl, {
        expires: Date.now() + 10 * 60_000,
        value,
      });
      return NextResponse.json(value);
    }

    let metadata: ReturnType<typeof parseOEmbedMetadata> = null;
    try {
      const endpoint =
        media.provider === "youtube"
          ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(media.canonicalUrl)}`
          : `https://open.spotify.com/oembed?url=${encodeURIComponent(media.canonicalUrl)}`;
      metadata = parseOEmbedMetadata(await fetchProviderJson(endpoint));
    } catch {
      /* creation remains available with structured fallback metadata */
    }

    const value: MediaPreview = {
      ...media,
      title: metadata?.title || null,
      creator: metadata?.creator || null,
      thumbnailUrl:
        metadata?.thumbnailUrl &&
        isAllowedMediaThumbnail(metadata.thumbnailUrl, media.provider)
          ? metadata.thumbnailUrl
          : media.provider === "youtube"
            ? `https://i.ytimg.com/vi/${media.externalId}/hqdefault.jpg`
            : null,
      durationMs: null,
    };
    cache.set(media.canonicalUrl, { expires: Date.now() + 10 * 60_000, value });
    return NextResponse.json(value);
  } catch {
    return NextResponse.json(
      { error: "The provider preview is temporarily unavailable" },
      { status: 422 },
    );
  }
}
