/** Minimal markdown → safe React-friendly HTML string (no external deps). */
export function renderSimpleMarkdown(source: string): string {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList: "ul" | "ol" | null = null;

  function closeList() {
    if (inList) {
      out.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  }

  for (const raw of lines) {
    const fence = raw.trim().startsWith("```");
    if (fence) {
      closeList();
      if (inCode) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        out.push('<pre class="md-pre"><code>');
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      out.push(`${raw}\n`);
      continue;
    }

    const heading = raw.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level} class="md-h${level}">${inline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = raw.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (inList !== "ul") {
        closeList();
        out.push('<ul class="md-ul">');
        inList = "ul";
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = raw.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (inList !== "ol") {
        closeList();
        out.push('<ol class="md-ol">');
        inList = "ol";
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    if (!raw.trim()) {
      closeList();
      out.push("<br />");
      continue;
    }

    closeList();
    out.push(`<p class="md-p">${inline(raw)}</p>`);
  }

  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("");
}

function inline(text: string) {
  return text
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a class="md-a" href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

export function noteFileName(text: string) {
  const base = text.trim().replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ") || "Untitled";
  return `${base.slice(0, 48)}.md`;
}
