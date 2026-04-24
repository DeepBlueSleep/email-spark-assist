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

// Convert plain text → safe HTML: escape, linkify, preserve newlines + runs of spaces
function plainTextToHtml(s: string): string {
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  // Preserve consecutive spaces (turn pairs into &nbsp; + space) and newlines
  const spaced = linked.replace(/  /g, "\u00a0 ").replace(/\n/g, "<br/>");
  return spaced;
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
    : `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${plainTextToHtml(decoded)}</pre>`;

  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
<style>
  html,body{margin:0;padding:0;background:transparent;color:hsl(222 15% 20%);}
  body{font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:14px; line-height:1.55; word-wrap:break-word;}
  a{color:hsl(221 83% 53%); text-decoration:underline;}
  img{max-width:100%; height:auto;}
  table{max-width:100%; border-collapse:collapse;}
  blockquote{border-left:3px solid #d1d5db; margin:0 0 0 .25rem; padding:.25rem 0 .25rem .75rem; color:#4b5563;}
  pre{white-space:pre-wrap; word-wrap:break-word;}
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
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={doc}
        style={{ width: "100%", height, border: 0, display: "block", background: "transparent" }}
      />
    </div>
  );
}
