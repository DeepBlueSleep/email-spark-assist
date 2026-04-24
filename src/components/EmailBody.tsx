import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";

// Decode common email transfer encodings (quoted-printable artifacts)
function decodeQuotedPrintable(s: string): string {
  if (!/=[0-9A-Fa-f]{2}|=\r?\n/.test(s)) return s;
  try {
    return s
      // Soft line breaks
      .replace(/=\r?\n/g, "")
      // =XX hex sequences
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } catch {
    return s;
  }
}

// More precise HTML detection: must contain at least one real tag, not just `<` characters
function looksLikeHtml(s: string): boolean {
  return /<(html|body|div|p|br|table|span|a|img|ul|ol|li|h[1-6]|strong|em|b|i|blockquote|style)\b[^>]*>/i.test(s);
}

// Convert plain text → safe HTML: escape, linkify, apply markdown-ish formatting,
// preserve newlines + runs of spaces.
function plainTextToHtml(s: string): string {
  // 1. Escape HTML special chars first
  let out = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Linkify URLs and bare emails
  out = out.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  out = out.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1">$1</a>'
  );

  // 3. Inline markdown-style emphasis
  //    **bold** / __bold__
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  //    *italic* / _italic_  (avoid matching inside words)
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>");

  // 4. Process line-by-line for lists + line breaks
  const lines = out.split(/\r?\n/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  for (const raw of lines) {
    const line = raw;
    const ulMatch = /^\s*[-*•]\s+(.*)$/.exec(line);
    const olMatch = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (ulMatch) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${olMatch[2]}</li>`);
    } else {
      closeList();
      // Preserve runs of spaces
      const preserved = line.replace(/ {2,}/g, (m) => "\u00a0".repeat(m.length));
      html.push(preserved + "<br/>");
    }
  }
  closeList();
  return html.join("");
}

// Build a fully self-contained HTML doc to inject into an iframe
function buildIframeDoc(rawBody: string): string {
  const decoded = decodeQuotedPrintable(rawBody);
  const isHtml = looksLikeHtml(decoded);
  const inner = isHtml
    ? DOMPurify.sanitize(decoded, {
        WHOLE_DOCUMENT: true,
        ADD_ATTR: ["target", "rel"],
        FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
      })
    : `<div class="plain">${plainTextToHtml(decoded)}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
<style>
  html,body{margin:0;padding:0;background:transparent;color:hsl(222 15% 20%);}
  body{font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:14px; line-height:1.55; word-wrap:break-word;}
  a{color:hsl(221 83% 53%); text-decoration:underline;}
  img{max-width:100%; height:auto;}
  table{max-width:100%; border-collapse:collapse;}
  blockquote{border-left:3px solid #d1d5db; margin:0 0 0 .25rem; padding:.25rem 0 .25rem .75rem; color:#4b5563;}
  pre{white-space:pre-wrap; word-wrap:break-word;}
  ul,ol{margin:.4rem 0 .4rem 1.25rem; padding:0;}
  li{margin:.15rem 0;}
  strong{font-weight:600;}
  em{font-style:italic;}
  .plain{white-space:normal;}
</style></head><body>${inner}</body></html>`;
}

interface EmailBodyProps {
  body: string;
}

export function EmailBody({ body }: EmailBodyProps) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(160);
  const doc = useMemo(() => buildIframeDoc(body || ""), [body]);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    const handleLoad = () => {
      try {
        const innerDoc = iframe.contentDocument;
        if (!innerDoc) return;
        const measure = () => {
          const h = Math.min(560, Math.max(120, innerDoc.documentElement.scrollHeight + 8));
          setHeight(h);
        };
        measure();
        // Re-measure after images load
        const imgs = innerDoc.images;
        for (let i = 0; i < imgs.length; i++) {
          const img = imgs[i];
          if (!img.complete) img.addEventListener("load", measure, { once: true });
        }
      } catch {
        // cross-origin; ignore
      }
    };
    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [doc]);

  return (
    <div className="bg-secondary/50 rounded-lg p-1 overflow-hidden">
      <iframe
        ref={ref}
        title="Email body"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        srcDoc={doc}
        style={{ width: "100%", height, border: 0, display: "block", background: "transparent" }}
      />
    </div>
  );
}
