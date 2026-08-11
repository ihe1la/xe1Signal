import { describe, expect, it } from "vitest";
import {
  buildObsidianNewUri,
  createDumpNote,
  formatDumpNoteMarkdown,
  noteVaultPath,
  noteWikiLink,
  parseDumpNotes,
  serializeDumpNotes,
  titleFromBody,
} from "@/lib/dump-notes";

describe("dump-notes", () => {
  it("creates notes with title, tags, and source", () => {
    const note = createDumpNote({
      body: "saw weird redirect on login #recon",
      sourceUrl: "https://example.com/login",
    });
    expect(note?.title).toBe("saw weird redirect on login #recon");
    expect(note?.tags).toContain("recon");
    expect(note?.sourceUrl).toBe("https://example.com/login");
  });

  it("builds Obsidian paths and wiki links", () => {
    const note = createDumpNote({ title: "CORS dump", body: "details here" })!;
    expect(noteVaultPath(note, "xe1Signal/Dump")).toBe("xe1Signal/Dump/CORS dump");
    expect(noteWikiLink(note, "xe1Signal/Dump")).toBe("[[xe1Signal/Dump/CORS dump]]");
  });

  it("formats markdown and Obsidian new URI", () => {
    const note = createDumpNote({
      title: "Paste dump",
      body: "quoted text",
      sourceUrl: "https://news.example/a",
    })!;
    const settings = { vaultName: "Research", folder: "xe1Signal/Dump" };
    const md = formatDumpNoteMarkdown(note, settings);
    expect(md).toContain("# Paste dump");
    expect(md).toContain("[[xe1Signal/Dump/Paste dump]]");
    expect(buildObsidianNewUri(note, settings)).toContain("obsidian://new?");
    expect(buildObsidianNewUri(note, settings)).toContain("vault=Research");
  });

  it("round-trips storage and titles from body", () => {
    expect(titleFromBody("# Hello world\nmore")).toBe("Hello world");
    const note = createDumpNote({ body: "one liner" })!;
    expect(parseDumpNotes(serializeDumpNotes([note]))).toEqual([note]);
  });
});
