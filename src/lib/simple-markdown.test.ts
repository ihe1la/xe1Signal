import { describe, expect, it } from "vitest";
import { noteFileName, renderSimpleMarkdown } from "@/lib/simple-markdown";

describe("simple-markdown", () => {
  it("renders headings lists code and links", () => {
    const html = renderSimpleMarkdown("# Title\n\n- one\n\n`code`\n\n[site](https://example.com)");
    expect(html).toContain('<h1 class="md-h1">Title</h1>');
    expect(html).toContain("<li>one</li>");
    expect(html).toContain('<code class="md-code">code</code>');
    expect(html).toContain('href="https://example.com"');
  });

  it("escapes raw html", () => {
    expect(renderSimpleMarkdown("<script>alert(1)</script>")).toContain("&lt;script&gt;");
  });

  it("builds safe note filenames", () => {
    expect(noteFileName("Recon / Auth")).toBe("Recon Auth.md");
    expect(noteFileName("")).toBe("Untitled.md");
  });
});
