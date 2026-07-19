import { randomBytes } from "node:crypto";
import { parse } from "parse5";
import { assertSafeUrl } from "@/lib/safe-url";

export const REFLECTION_MAX_PARAMETERS = 30;
export const REFLECTION_MAX_BODY_BYTES = 1_000_000;
export type ReflectionMode = "combined" | "separate";

export type ParameterMarker = {
  name: string;
  occurrenceIndex: number;
  marker: string;
  originalValue: string;
};

export type ReflectionResultData = ParameterMarker & {
  reflected: boolean;
  reflectionCount: number;
  firstPosition: number | null;
  snippet: string | null;
  context: string | null;
  encoding: string | null;
  responseSection: string | null;
};

export type ReflectionRunOutput = {
  targetUrl: string;
  finalRequestUrl: string;
  mode: ReflectionMode;
  statusCode: number;
  contentType: string;
  responseSize: number;
  responseTimeMs: number;
  results: ReflectionResultData[];
  requestCount: number;
};

export function canAccessReflectionMapper(enabled: boolean, role: string | undefined) {
  return enabled && role === "OWNER";
}

export function parseTargetAllowlist(value: string | undefined) {
  return (value || "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

export function isAllowedTargetHost(hostname: string, allowlist: string[]) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowlist.some((entry) => {
    const allowed = entry.replace(/\.$/, "");
    if (allowed.startsWith("*.")) {
      const suffix = allowed.slice(2);
      return host !== suffix && host.endsWith(`.${suffix}`);
    }
    return host === allowed;
  });
}

export function normalizeMarkerPrefix(prefix: string) {
  const normalized = prefix.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 24);
  return normalized || "REFLECT";
}

export function createMarker(prefix: string, index: number, random = () => randomBytes(2).toString("hex").toUpperCase()) {
  return `${normalizeMarkerPrefix(prefix)}_${index + 1}_${random()}`;
}

export function createParameterMarkers(target: URL, prefix: string, random?: () => string) {
  const occurrences = new Map<string, number>();
  const markers: ParameterMarker[] = [...target.searchParams.entries()].map(([name, value], index) => {
    const occurrenceIndex = occurrences.get(name) || 0;
    occurrences.set(name, occurrenceIndex + 1);
    return { name, occurrenceIndex, originalValue: value, marker: createMarker(prefix, index, random) };
  });
  if (!markers.length) throw new Error("The target URL must contain at least one query parameter");
  if (markers.length > REFLECTION_MAX_PARAMETERS) throw new Error(`A maximum of ${REFLECTION_MAX_PARAMETERS} parameter occurrences is allowed`);
  return markers;
}

export function buildCombinedUrl(target: URL, markers: ParameterMarker[]) {
  const next = new URL(target.toString());
  next.search = "";
  for (const marker of markers) next.searchParams.append(marker.name, marker.marker);
  return next;
}

export function buildSeparateUrls(target: URL, markers: ParameterMarker[]) {
  const entries = [...target.searchParams.entries()];
  return markers.map((marker, markerIndex) => {
    const next = new URL(target.toString());
    next.search = "";
    entries.forEach(([name, value], index) => next.searchParams.append(name, index === markerIndex ? marker.marker : value));
    return next;
  });
}

type EncodedVariant = { value: string; encoding: string };

export function markerVariants(marker: string): EncodedVariant[] {
  const candidates: EncodedVariant[] = [
    { value: marker, encoding: "none" },
    { value: encodeURIComponent(marker), encoding: "URL encoded" },
    { value: [...marker].map((char) => `&#${char.charCodeAt(0)};`).join(""), encoding: "HTML encoded" },
    { value: [...marker].map((char) => `&#x${char.charCodeAt(0).toString(16)};`).join(""), encoding: "HTML encoded" },
    { value: [...marker].map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).join(""), encoding: "JSON escaped" },
    { value: [...marker].map((char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""), encoding: "JavaScript escaped" },
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (!candidate.value || seen.has(candidate.value)) return false;
    seen.add(candidate.value);
    return true;
  });
}

type ParsedNode = { nodeName?: string; tagName?: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: ParsedNode[]; parentNode?: ParsedNode };

function nodeContainsMarker(value: string | undefined, marker: string) {
  if (!value) return false;
  return markerVariants(marker).some((variant) => value.includes(variant.value)) || value.includes(marker);
}

function contextFromHtml(body: string, marker: string) {
  const document = parse(body) as ParsedNode;
  let found: string | null = null;
  function visit(node: ParsedNode, parentTag = "") {
    if (found) return;
    const tag = node.tagName || parentTag;
    for (const attribute of node.attrs || []) {
      if (nodeContainsMarker(attribute.value, marker)) {
        found = ["href", "src", "action", "formaction"].includes(attribute.name.toLowerCase()) ? "URL" : "HTML attribute";
        return;
      }
    }
    if (node.nodeName === "#text" && nodeContainsMarker(node.value, marker)) {
      if (tag === "script") found = /["'`]\s*[^"'`]*$/.test((node.value || "").split(marker)[0]) ? "JavaScript string" : "script block";
      else found = "HTML text";
      return;
    }
    for (const child of node.childNodes || []) visit(child, tag);
  }
  visit(document);
  return found;
}

function detectBodyContext(body: string, reflectedValue: string, marker: string, contentType: string) {
  if (/json/i.test(contentType)) return /["'](?:[^"'\\]|\\.)*$/.test(body.slice(0, Math.max(0, body.indexOf(reflectedValue)))) ? "JSON string" : "unknown";
  if (/html|xml/i.test(contentType)) return contextFromHtml(body, marker) || "unknown";
  return /https?:\/\/[^\s"']*$/i.test(body.slice(0, Math.max(0, body.indexOf(reflectedValue)))) ? "URL" : "unknown";
}

function collectOccurrences(haystack: string, needle: string) {
  const positions: number[] = [];
  let offset = 0;
  while (needle && offset <= haystack.length) {
    const position = haystack.indexOf(needle, offset);
    if (position === -1) break;
    positions.push(position);
    offset = position + Math.max(1, needle.length);
  }
  return positions;
}

export function analyzeReflection(marker: ParameterMarker, body: string, headers: Headers | Record<string, string>, contentType: string): ReflectionResultData {
  const headerText = headers instanceof Headers ? [...headers.entries()].map(([key, value]) => `${key}: ${value}`).join("\n") : Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join("\n");
  const matches: { position: number; value: string; encoding: string; section: string }[] = [];
  for (const variant of markerVariants(marker.marker)) {
    for (const position of collectOccurrences(body, variant.value)) matches.push({ position, value: variant.value, encoding: variant.encoding, section: "body" });
    for (const position of collectOccurrences(headerText, variant.value)) matches.push({ position, value: variant.value, encoding: variant.encoding, section: "response header" });
  }
  matches.sort((a, b) => a.position - b.position);
  const first = matches[0];
  const context = first?.section === "response header" ? "response header" : first ? detectBodyContext(body, first.value, marker.marker, contentType) : null;
  const source = first?.section === "response header" ? headerText : body;
  return {
    ...marker,
    reflected: matches.length > 0,
    reflectionCount: matches.length,
    firstPosition: first?.position ?? null,
    snippet: first ? source.slice(Math.max(0, first.position - 80), first.position + first.value.length + 80) : null,
    context,
    encoding: first?.encoding || null,
    responseSection: first?.section || null,
  };
}

export function parseCustomHeaders(text: string | undefined, cookie: string | undefined) {
  const headers: Record<string, string> = { accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.5", "user-agent": "SignalArchiveReflectionMapper/1.0" };
  const blocked = new Set(["host", "content-length", "connection", "transfer-encoding", "proxy-authorization", "proxy-connection", "upgrade"]);
  for (const line of (text || "").split(/\r?\n/).filter(Boolean)) {
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error("Custom headers must use one Name: value pair per line");
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(name) || blocked.has(name) || /[\r\n]/.test(value)) throw new Error(`Header ${name || "value"} is not allowed`);
    headers[name] = value;
  }
  if (cookie?.trim()) {
    if (/[\r\n]/.test(cookie)) throw new Error("Cookie header is invalid");
    headers.cookie = cookie.trim();
  }
  return headers;
}

export function redactSensitiveHeaders(headers: Record<string, string>) {
  const sensitive = /authorization|cookie|token|api[-_]?key|secret|session/i;
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, sensitive.test(key) ? "[REDACTED]" : value]));
}

export async function assertAllowedReflectionTarget(value: string, allowlist: string[]) {
  const raw = new URL(value);
  if (raw.username || raw.password) throw new Error("URLs containing credentials are not allowed");
  if (!isAllowedTargetHost(raw.hostname, allowlist)) throw new Error("Target hostname is not in the Test Lab allowlist");
  return assertSafeUrl(raw.toString());
}

type FetchLike = typeof fetch;
type RunnerDependencies = {
  fetchImpl?: FetchLike;
  validateTarget?: (value: string) => Promise<URL>;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
};

async function readLimitedBody(response: Response) {
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > REFLECTION_MAX_BODY_BYTES) throw new Error("Response body exceeded the 1 MB limit");
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  return { body: new TextDecoder().decode(bytes), size: bytes.byteLength };
}

export async function fetchWithSafeRedirects(initialUrl: URL, headers: Record<string, string>, dependencies: Required<Pick<RunnerDependencies, "fetchImpl" | "validateTarget">>) {
  let current = initialUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
    const response = await dependencies.fetchImpl(current, { method: "GET", headers, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (response.status < 300 || response.status >= 400) return { response, finalUrl: current };
    if (redirectCount === 3) throw new Error("Redirect limit exceeded");
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect response did not include a location");
    current = await dependencies.validateTarget(new URL(location, current).toString());
  }
  throw new Error("Request failed");
}

export async function runReflectionMapper(input: { targetUrl: string; markerPrefix: string; mode: ReflectionMode; delayMs: number; customHeaders?: string; cookie?: string }, allowlist: string[], dependencies: RunnerDependencies = {}): Promise<ReflectionRunOutput> {
  const validateTarget = dependencies.validateTarget || ((value: string) => assertAllowedReflectionTarget(value, allowlist));
  const fetchImpl = dependencies.fetchImpl || fetch;
  const sleep = dependencies.sleep || ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = dependencies.now || Date.now;
  const target = await validateTarget(input.targetUrl);
  const markers = createParameterMarkers(target, input.markerPrefix);
  const headers = parseCustomHeaders(input.customHeaders, input.cookie);
  const requests = input.mode === "separate" ? buildSeparateUrls(target, markers) : [buildCombinedUrl(target, markers)];
  const delay = input.mode === "separate" ? Math.max(500, input.delayMs) : Math.max(0, input.delayMs);
  const merged = new Map<string, ReflectionResultData>();
  let finalRequestUrl = requests[0].toString();
  let statusCode = 0;
  let contentType = "";
  let responseSize = 0;
  const startedAt = now();
  for (let index = 0; index < requests.length; index++) {
    if (index > 0 && delay) await sleep(delay);
    const { response, finalUrl } = await fetchWithSafeRedirects(requests[index], headers, { fetchImpl, validateTarget });
    const payload = await readLimitedBody(response);
    finalRequestUrl = finalUrl.toString();
    statusCode = response.status;
    contentType = response.headers.get("content-type") || "unknown";
    responseSize += payload.size;
    const currentMarkers = input.mode === "separate" ? [markers[index]] : markers;
    for (const marker of currentMarkers) merged.set(marker.marker, analyzeReflection(marker, payload.body, response.headers, contentType));
  }
  return {
    targetUrl: `${target.origin}${target.pathname}`,
    finalRequestUrl,
    mode: input.mode,
    statusCode,
    contentType,
    responseSize,
    responseTimeMs: Math.max(0, now() - startedAt),
    results: markers.map((marker) => merged.get(marker.marker) || analyzeReflection(marker, "", {}, "")),
    requestCount: requests.length,
  };
}
