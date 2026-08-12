import { describe, expect, it } from "vitest";

import {
  convertTimestamp,
  decodeBase64,
  decodeHtml,
  decodeJwt,
  decodeUrl,
  diffLines,
  encodeBase64,
  encodeHtml,
  encodeUrl,
  formatDiff,
  formatJson,
  formatJsEndpoints,
  generateLorem,
  hashText,
  jsEndpointBookmarklet,
  parseUrl,
  scanJsEndpoints,
} from "@/lib/tools";

describe("local tools", () => {
  it("round-trips URL-encoded text", () => {
    expect(decodeUrl(encodeUrl("Signal archive ✓ / tools"))).toBe("Signal archive ✓ / tools");
  });

  it("round-trips Unicode Base64 text", () => {
    const value = "Signal archive ✓";
    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });

  it("encodes and decodes common HTML entities", () => {
    const value = `<a title="signal">It's & useful</a>`;
    expect(decodeHtml(encodeHtml(value))).toBe(value);
  });

  it("formats JSON and decodes JWT header and payload", () => {
    expect(formatJson('{"name":"xe1Signal","ok":true}')).toContain('"name": "xe1Signal"');
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoZWxhIiwiaWF0IjoxNzAwMDAwMDAwfQ.signature";
    expect(decodeJwt(token)).toEqual({ header: { alg: "HS256", typ: "JWT" }, payload: { sub: "hela", iat: 1700000000 } });
  });

  it("parses URL parts and search parameters", () => {
    const output = parseUrl("https://user:pass@example.com:8443/path?q=one&q=two#hash");
    expect(output).toContain('"hostname": "example.com"');
    expect(output).toContain('"value": "two"');
  });

  it("converts Unix timestamps", () => {
    expect(convertTimestamp("0")).toContain("1970-01-01T00:00:00.000Z");
    expect(convertTimestamp("2026-08-11T00:00:00Z")).toContain("Unix sec");
  });

  it("returns line-oriented text diffs", () => {
    expect(diffLines("same\nold", "same\nnew")).toEqual([
      { type: "same", text: "same" },
      { type: "removed", text: "old" },
      { type: "added", text: "new" },
    ]);
    expect(formatDiff("a", "b")).toBe("- a\n+ b");
  });

  it("generates bounded Lorem Ipsum output", () => {
    const output = generateLorem(2, 2);
    expect(output.split("\n\n")).toHaveLength(2);
    expect(output).toContain("Lorem ipsum");
  });

  it("supports MD5 and Web Crypto SHA hashes", async () => {
    expect(await hashText("hello", "MD5")).toBe("5d41402abc4b2a76b9719d911017c592");
    expect(await hashText("hello", "SHA-256")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("extracts JS endpoints, params, and script URLs from paste", () => {
    const source = `
      <script src="/static/app.js"></script>
      const path = "/api/v1/users?id=1&sort=asc";
      fetch('/graphql');
      href="/login"
    `;
    const scan = scanJsEndpoints(source);
    expect(scan.endpoints).toEqual(expect.arrayContaining(["/api/v1/users?id=1&sort=asc", "/graphql", "/login", "/static/app.js"]));
    expect(scan.parameters.map((parameter) => parameter.name).sort()).toEqual(["id", "sort"]);
    expect(scan.jsFiles).toEqual(expect.arrayContaining(["/static/app.js"]));

    const formatted = formatJsEndpoints(source, "https://target.example");
    expect(formatted).toContain("→ https://target.example/graphql");
    expect(formatted).toContain("id  ← paste");
  });

  it("exports a fixed endpoint bookmarklet", () => {
    const bookmarklet = jsEndpointBookmarklet();
    expect(bookmarklet.startsWith("javascript:")).toBe(true);
    expect(bookmarklet).toContain("Promise.allSettled");
    expect(bookmarklet).toContain("Endpoints");
  });
});
