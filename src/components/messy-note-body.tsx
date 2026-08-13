"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
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

/** Keep markdown ``` fences intact so long JWTs inside them stay in one code box. */
export function splitMessyNoteBody(body: string): BodyBlock[] {
  const lines = body.split(/(\n)/);
  const blocks: BodyBlock[] = [];
  let textBuffer = "";
  let inFence = false;

  function flushText() {
    if (!textBuffer) return;
    blocks.push({ kind: "text", value: textBuffer });
    textBuffer = "";
  }

  for (const part of lines) {
    if (!part) continue;
    if (part === "\n") {
      textBuffer += part;
      continue;
    }

    if (/^ {0,3}(`{3,}|~{3,})/.test(part)) {
      inFence = !inFence;
      textBuffer += part;
      continue;
    }

    if (!inFence && looksLikeCodeBlob(part)) {
      flushText();
      blocks.push({ kind: "code", value: part.trim() });
      continue;
    }

    textBuffer += part;
  }

  flushText();
  return blocks.length > 0 ? blocks : [{ kind: "text", value: body }];
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-2 font-sans text-lg font-semibold tracking-tight text-zinc-100">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 font-sans text-base font-semibold tracking-tight text-zinc-100">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 font-sans text-[15px] font-semibold text-zinc-100">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1.5 font-sans text-sm font-semibold text-zinc-200">{children}</h4>,
  h5: ({ children }) => <h5 className="mb-1 font-sans text-sm font-medium text-zinc-200">{children}</h5>,
  h6: ({ children }) => <h6 className="mb-1 font-sans text-[13px] font-medium text-zinc-300">{children}</h6>,
  p: ({ children }) => (
    <p className="min-w-0 break-words font-sans text-[15px] leading-6 text-zinc-200 [overflow-wrap:anywhere] [&:not(:last-child)]:mb-2">
      {children}
    </p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
  del: ({ children }) => <del className="text-zinc-500">{children}</del>,
  hr: () => <hr className="my-3 border-white/[.08]" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-violet-400/40 pl-3 text-zinc-400 [&:not(:last-child)]:mb-2">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 font-sans text-[15px] leading-6 text-zinc-200 marker:text-zinc-600">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 font-sans text-[15px] leading-6 text-zinc-200 marker:text-zinc-500">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="break-words [overflow-wrap:anywhere]">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline break-all text-violet-300 underline decoration-violet-400/30 underline-offset-2 transition hover:text-violet-200"
    >
      {children}
      <ExternalLink className="ml-1 inline h-3 w-3 shrink-0 align-[-1px] opacity-70" />
    </a>
  ),
  img: ({ src, alt }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt || ""}
        referrerPolicy="no-referrer"
        className="my-2 max-h-72 max-w-full rounded-lg border border-white/[.08]"
      />
    ) : null,
  pre: ({ children }) => (
    <pre className="my-2 max-h-56 overflow-auto rounded-xl border border-white/[.08] bg-[#090a0f] px-3 py-2.5 font-mono text-[11px] leading-5 text-zinc-400 [overflow-wrap:anywhere] whitespace-pre-wrap break-all">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className) || String(children).includes("\n");
    if (isBlock) {
      return (
        <code className={cn("font-mono text-[11px] leading-5 text-zinc-400", className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-white/[.08] px-1 py-0.5 font-mono text-[12px] text-violet-200" {...props}>
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto rounded-xl border border-white/[.08]">
      <table className="w-full min-w-[320px] border-collapse text-left font-sans text-[13px] text-zinc-200">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/[.04] text-zinc-300">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-white/[.08] px-2.5 py-1.5 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/[.06] px-2.5 py-1.5 align-top [overflow-wrap:anywhere]">{children}</td>
  ),
  input: ({ type, checked, ...props }) =>
    type === "checkbox" ? (
      <input type="checkbox" checked={Boolean(checked)} disabled readOnly className="mr-2 align-middle accent-violet-400" />
    ) : (
      <input type={type} checked={checked} {...props} />
    ),
};

type MessyNoteBodyProps = {
  body: string;
  linkUrls?: boolean;
  className?: string;
};

export function MessyNoteBody({ body, className }: MessyNoteBodyProps) {
  const blocks = React.useMemo(() => splitMessyNoteBody(body), [body]);

  return (
    <div className={cn("note-md min-w-0 space-y-2 overflow-hidden", className)}>
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
          <Markdown
            key={`t-${index}`}
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={markdownComponents}
          >
            {block.value}
          </Markdown>
        );
      })}
    </div>
  );
}

type NoteMarkdownFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
  textareaClassName?: string;
};

export function NoteMarkdownField({
  id,
  value,
  onChange,
  onKeyDown,
  textareaRef,
  rows = 4,
  placeholder,
  ariaLabel,
  textareaClassName,
}: NoteMarkdownFieldProps) {
  const [mode, setMode] = React.useState<"write" | "preview">("write");

  React.useEffect(() => {
    if (mode === "preview" && !value.trim()) setMode("write");
  }, [mode, value]);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex justify-end" role="tablist" aria-label="Note editor mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "write"}
          onClick={() => setMode("write")}
          className={cn(
            "rounded-md px-2 py-1 font-sans text-[10px] uppercase tracking-[.12em] transition",
            mode === "write" ? "text-violet-200" : "text-zinc-600 hover:text-zinc-400",
          )}
        >
          Write
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          disabled={!value.trim()}
          onClick={() => setMode("preview")}
          className={cn(
            "rounded-md px-2 py-1 font-sans text-[10px] uppercase tracking-[.12em] transition disabled:cursor-not-allowed disabled:opacity-40",
            mode === "preview" ? "text-violet-200" : "text-zinc-600 hover:text-zinc-400",
          )}
        >
          Preview
        </button>
      </div>
      {mode === "preview" ? (
        <div className="min-h-[88px] px-1 py-1">
          <MessyNoteBody body={value} linkUrls />
        </div>
      ) : (
        <textarea
          id={id}
          ref={textareaRef}
          aria-label={ariaLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          placeholder={placeholder}
          className={textareaClassName}
        />
      )}
    </div>
  );
}
