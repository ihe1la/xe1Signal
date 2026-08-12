import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type BodyBlock =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string };

/** Long unbroken blobs (bookmarklets, minified JS) that wreck card layouts. */
function looksLikeCodeBlob(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^javascript:/i.test(trimmed)) return true;
  if (trimmed.length >= 160 && (trimmed.match(/\s/g)?.length ?? 0) < Math.max(3, trimmed.length / 80)) {
    return true;
  }
  return false;
}

export function splitMessyNoteBody(body: string): BodyBlock[] {
  const parts = body.split(/(\n+)/);
  const blocks: BodyBlock[] = [];
  let textBuffer = "";

  function flushText() {
    if (!textBuffer) return;
    blocks.push({ kind: "text", value: textBuffer });
    textBuffer = "";
  }

  for (const part of parts) {
    if (!part) continue;
    if (/^\n+$/.test(part)) {
      textBuffer += part;
      continue;
    }
    if (looksLikeCodeBlob(part)) {
      flushText();
      blocks.push({ kind: "code", value: part.trim() });
      continue;
    }
    textBuffer += part;
  }
  flushText();
  return blocks.length > 0 ? blocks : [{ kind: "text", value: body }];
}

function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return (
    <>
      {parts.map((part, index) => {
        const isUrl = part.startsWith("http://") || part.startsWith("https://");
        if (!isUrl) {
          return <React.Fragment key={`t-${index}`}>{part}</React.Fragment>;
        }
        const href = part.replace(/[),.;]+$/g, "");
        const trailing = part.slice(href.length);
        return (
          <React.Fragment key={`${href}-${index}`}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline break-all text-violet-300 underline decoration-violet-400/30 underline-offset-2 transition hover:text-violet-200"
            >
              {href}
              <ExternalLink className="ml-1 inline h-3 w-3 shrink-0 align-[-1px] opacity-70" />
            </a>
            {trailing}
          </React.Fragment>
        );
      })}
    </>
  );
}

type MessyNoteBodyProps = {
  body: string;
  linkUrls?: boolean;
  className?: string;
};

export function MessyNoteBody({ body, linkUrls = false, className }: MessyNoteBodyProps) {
  const blocks = React.useMemo(() => splitMessyNoteBody(body), [body]);

  return (
    <div className={cn("min-w-0 space-y-2 overflow-hidden", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "code") {
          return (
            <pre
              key={`c-${index}`}
              className="max-h-56 overflow-auto rounded-xl border border-white/[.08] bg-[#090a0f] px-3 py-2.5 font-mono text-[11px] leading-5 text-zinc-400 [overflow-wrap:anywhere] whitespace-pre-wrap break-all"
            >
              {block.value}
            </pre>
          );
        }

        return (
          <p
            key={`t-${index}`}
            className="min-w-0 whitespace-pre-wrap break-words font-sans text-[15px] leading-6 text-zinc-200 [overflow-wrap:anywhere]"
          >
            {linkUrls ? <LinkedText text={block.value} /> : block.value}
          </p>
        );
      })}
    </div>
  );
}
