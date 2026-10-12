export const plural = (noun: string) => `${noun}s`;

export const pluralWord = (count: number, noun: string) => (count === 1 ? noun : plural(noun));

export const pluralize = (count: number, noun: string) => `${count} ${pluralWord(count, noun)}`;

export const isAre = (count: number) => (count === 1 ? "is" : "are");

export const joinList = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export function slugify(text: string) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-");
}

export function sanitizeStringList(
  input: unknown,
  options: { maxItems?: number; maxLength?: number; dedupeCaseInsensitive?: boolean } = {}
): string[] {
  const {
    maxItems = 50,
    maxLength = 200,
    dedupeCaseInsensitive = true,
  } = options;

  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const item of input) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim();
    if (!normalized || normalized.length > maxLength) {
      continue;
    }

    const dedupeKey = dedupeCaseInsensitive ? normalized.toLowerCase() : normalized;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    sanitized.push(normalized);

    if (sanitized.length >= maxItems) {
      break;
    }
  }

  return sanitized;
}
