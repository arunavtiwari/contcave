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

export function getPlainTextFromHTML(html: string | null | undefined, maxLength = 160) {
  if (!html) return "";

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (!maxLength) return text;

  return text.length > maxLength
    ? text.slice(0, maxLength).trim() + "..."
    : text;
}
