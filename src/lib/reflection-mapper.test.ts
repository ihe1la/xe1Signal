import { describe, expect, it, vi } from "vitest";
import {
  REFLECTION_MAX_PARAMETERS,
  analyzeReflection,
  assertAllowedReflectionTarget,
  buildCombinedUrl,
  buildSeparateUrls,
  canAccessReflectionMapper,
  createMarker,
  createParameterMarkers,
  fetchWithSafeRedirects,
  isAllowedTargetHost,
  parseCustomHeaders,
  redactSensitiveHeaders,
  runReflectionMapper,
} from "./reflection-mapper";

const marker = { name: "q", occurrenceIndex: 0, originalValue: "hello", marker: "REFLECT_1_A7F2" };

describe("reflection parameter mapping", () => {
  it("handles normal, empty, repeated, and encoded parameters", () => {
    const target = new URL("https://lab.example/search?name=hello&empty=&id=1&id=2&encoded=a%20b&x%20y=z");
    const markers = createParameterMarkers(target, "REFLECT", () => "ABCD");
    expect(markers.map(({ name, occurrenceIndex, originalValue }) => ({ name, occurrenceIndex, originalValue }))).toEqual([
      { name: "name", occurrenceIndex: 0, originalValue: "hello" },
      { name: "empty", occurrenceIndex: 0, originalValue: "" },
      { name: "id", occurrenceIndex: 0, originalValue: "1" },
      { name: "id", occurrenceIndex: 1, originalValue: "2" },
      { name: "encoded", occurrenceIndex: 0, originalValue: "a b" },
      { name: "x y", occurrenceIndex: 0, originalValue: "z" },
    ]);
    const combined = buildCombinedUrl(target, markers);
    expect(combined.pathname).toBe("/search");
    expect(combined.searchParams.getAll("id")).toEqual([markers[2].marker, markers[3].marker]);
    expect(buildSeparateUrls(target, markers)[3].searchParams.getAll("id")).toEqual(["1", markers[3].marker]);
  });

  it("generates unique per-run markers and enforces the maximum", () => {
    expect(createMarker("reflect", 0, () => "AAAA")).not.toBe(createMarker("reflect", 1, () => "BBBB"));
    const query = Array.from({ length: REFLECTION_MAX_PARAMETERS + 1 }, (_, i) => `p${i}=x`).join("&");
    expect(() => createParameterMarkers(new URL(`https://lab.example/?${query}`), "R")).toThrow(/maximum/i);
  });
});

describe("reflection analysis", () => {
  it.each([
    ["exact", "text/plain", `before ${marker.marker} after`, "none", "unknown"],
    ["URL encoded", "text/plain", `https://x.test/?q=${encodeURIComponent("value with space")}`, "URL encoded", "URL"],
    ["HTML encoded", "text/html", `<p>${[...marker.marker].map((c) => `&#${c.charCodeAt(0)};`).join("")}</p>`, "HTML encoded", "HTML text"],
    ["JSON", "application/json", `{"q":"${marker.marker}"}`, "none", "JSON string"],
    ["script", "text/html", `<script>const q = "${marker.marker}";</script>`, "none", "JavaScript string"],
    ["attribute", "text/html", `<input value="${marker.marker}">`, "none", "HTML attribute"],
  ])("detects %s reflection", (_name, contentType, body, encoding, context) => {
    const subject = _name === "URL encoded" ? { ...marker, marker: "value with space" } : marker;
    const result = analyzeReflection(subject, body, {}, contentType);
    expect(result).toMatchObject({ reflected: true, encoding, context });
  });

  it("handles no reflection, multiple reflections, and response headers", () => {
    expect(analyzeReflection(marker, "nothing", {}, "text/plain").reflected).toBe(false);
    expect(analyzeReflection(marker, `${marker.marker} ${marker.marker}`, {}, "text/plain").reflectionCount).toBe(2);
    expect(analyzeReflection(marker, "", { location: `/?q=${marker.marker}` }, "text/plain").context).toBe("response header");
  });
});

describe("access and request safety", () => {
  it("requires enabled owner access and matches exact or wildcard allowlists", () => {
    expect(canAccessReflectionMapper(true, "OWNER")).toBe(true);
    expect(canAccessReflectionMapper(false, "OWNER")).toBe(false);
    expect(canAccessReflectionMapper(true, "USER")).toBe(false);
    expect(isAllowedTargetHost("lab.example.com", ["lab.example.com"])).toBe(true);
    expect(isAllowedTargetHost("a.lab.example.com", ["*.lab.example.com"])).toBe(true);
    expect(isAllowedTargetHost("example.com.evil.test", ["example.com"])).toBe(false);
  });

  it("rejects private IPs and credentials", async () => {
    await expect(assertAllowedReflectionTarget("http://127.0.0.1/?q=x", ["127.0.0.1"])).rejects.toThrow();
    await expect(assertAllowedReflectionTarget("https://user:pass@lab.example/?q=x", ["lab.example"])).rejects.toThrow(/credentials/i);
  });

  it("revalidates redirects and rejects redirects leaving scope", async () => {
    const validateTarget = vi.fn(async (value: string) => {
      const url = new URL(value);
      if (url.hostname !== "lab.example") throw new Error("outside scope");
      return url;
    });
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://evil.example/" } })) as typeof fetch;
    await expect(fetchWithSafeRedirects(new URL("https://lab.example/?q=x"), {}, { fetchImpl, validateTarget })).rejects.toThrow(/outside scope/);
  });

  it("parses headers while redacting sensitive values", () => {
    const headers = parseCustomHeaders("X-Test: safe\nAuthorization: Bearer secret", "sid=secret");
    expect(redactSensitiveHeaders(headers)).toMatchObject({ "x-test": "safe", authorization: "[REDACTED]", cookie: "[REDACTED]" });
  });
});

describe("request modes", () => {
  it.each(["combined", "separate"] as const)("runs %s mode sequentially", async (mode) => {
    let active = 0;
    let maxActive = 0;
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      active++;
      maxActive = Math.max(maxActive, active);
      const url = new URL(input.toString());
      const body = [...url.searchParams.values()].join(" ");
      active--;
      return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
    }) as typeof fetch;
    const sleep = vi.fn(async () => undefined);
    const output = await runReflectionMapper(
      { targetUrl: "https://lab.example/?a=1&b=2", markerPrefix: "REFLECT", mode, delayMs: 0 },
      ["lab.example"],
      { fetchImpl, sleep, validateTarget: async (value) => new URL(value), now: () => 100 },
    );
    expect(output.requestCount).toBe(mode === "combined" ? 1 : 2);
    expect(maxActive).toBe(1);
    expect(output.results.every((result) => result.reflected)).toBe(true);
    expect(sleep).toHaveBeenCalledTimes(mode === "separate" ? 1 : 0);
    if (mode === "separate") expect(sleep).toHaveBeenCalledWith(500);
  });
});
