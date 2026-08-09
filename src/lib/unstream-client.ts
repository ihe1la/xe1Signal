import { z } from "zod";

const QUALITY_VALUES = ["128", "192", "320", "original"] as const;
export type UnstreamQuality = (typeof QUALITY_VALUES)[number];

const unstreamTrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(500),
  artists: z.array(z.string().max(300)).max(32),
  album: z.string().max(500),
  duration_ms: z.number().nonnegative(),
  cover_url: z.string().url().nullable(),
});

const unstreamCollectionSchema = z.object({
  kind: z.enum(["track", "album", "playlist"]),
  name: z.string().max(500),
  owner: z.string().max(500),
  cover_url: z.string().url().nullable(),
  tracks: z.array(unstreamTrackSchema).min(1),
});

const unstreamJobTrackSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  progress: z.number().min(0).max(1),
  error: z.string().nullable(),
  ext: z.string().nullable(),
});

const unstreamJobSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  quality: z.string(),
  tracks: z.array(unstreamJobTrackSchema),
  done: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  finished: z.boolean(),
});

const unstreamDownloadSchema = z.object({ job_id: z.string().min(1) });

export type UnstreamTrack = z.infer<typeof unstreamTrackSchema>;
export type UnstreamCollection = z.infer<typeof unstreamCollectionSchema>;
export type UnstreamJob = z.infer<typeof unstreamJobSchema>;

export class UnstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UnstreamError";
  }
}

function unstreamBaseUrl() {
  const configured = process.env.UNSTREAM_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:8020";
  throw new Error("UNSTREAM_API_URL is not configured");
}

function unstreamUrl(pathname: string) {
  return `${unstreamBaseUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
  return typeof payload?.detail === "string"
    ? payload.detail
    : `Unstream returned HTTP ${response.status}`;
}

async function requestJson<T>(pathname: string, init: RequestInit, schema: z.ZodType<T>, timeoutMs: number) {
  let response: Response;
  try {
    response = await fetch(unstreamUrl(pathname), {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(`Unstream is unavailable: ${error instanceof Error ? error.message : "request failed"}`);
  }
  if (!response.ok) throw new UnstreamError(await readError(response), response.status);
  const payload = await response.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new Error("Unstream returned an unexpected response");
  return parsed.data;
}

export function getUnstreamTrackFileUrl(jobId: string, trackId: string) {
  return unstreamUrl(`/api/jobs/${encodeURIComponent(jobId)}/tracks/${encodeURIComponent(trackId)}/file`);
}

export async function resolveUnstreamUrl(url: string) {
  return requestJson(
    "/api/resolve",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    },
    unstreamCollectionSchema,
    30_000,
  );
}

export async function startUnstreamDownload(url: string, trackIds: string[], quality: UnstreamQuality = "192") {
  if (!QUALITY_VALUES.includes(quality)) throw new Error("Unsupported Unstream quality");
  return requestJson(
    "/api/download",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, track_ids: trackIds, quality }),
    },
    unstreamDownloadSchema,
    30_000,
  );
}

export async function getUnstreamJob(jobId: string) {
  return requestJson(`/api/jobs/${encodeURIComponent(jobId)}`, { method: "GET" }, unstreamJobSchema, 15_000);
}

export async function getUnstreamTrackFile(jobId: string, trackId: string, range?: string | null) {
  let response: Response;
  try {
    response = await fetch(getUnstreamTrackFileUrl(jobId, trackId), {
      headers: range ? { range } : undefined,
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(`Unstream is unavailable: ${error instanceof Error ? error.message : "request failed"}`);
  }
  return response;
}
