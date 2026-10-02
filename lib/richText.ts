export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;

  const stripped = html.replace(/<[^>]*>/g, "");

  const sanitized = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

  return sanitized.length === 0;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  times: "×",
  middot: "·",
  bull: "•",
  deg: "°",
  copy: "©",
  reg: "®",
  trade: "™",
};

const decodeEntity = (entity: string, code: string) => {
  if (code[0] === "#") {
    const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  }
  return NAMED_ENTITIES[code] ?? entity;
};

const BLOCK_TAG = /<\/?(?:address|article|blockquote|br|dd|div|dl|dt|figcaption|h[1-6]|hr|li|ol|p|pre|section|table|td|th|tr|ul)\b[^>]*>/gi;

export function getPlainTextFromHTML(html: string | null | undefined, maxLength = 160) {
  if (!html) return "";

  const text = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(BLOCK_TAG, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, decodeEntity)
    .replace(/[​⁠﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!maxLength) return text;

  return truncateText(text, maxLength);
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, maxLength - 1);
  const wordEnd = slice.lastIndexOf(" ");
  const cut = wordEnd > maxLength * 0.6 ? slice.slice(0, wordEnd) : slice;
  return `${cut.replace(/[\s,;:.!?–—-]+$/, "")}…`;
}
