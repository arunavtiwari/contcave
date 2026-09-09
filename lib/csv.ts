/**
 * Shared enterprise CSV export utility.
 * Handles cell escaping, sanitization, and browser blob downloading.
 */

export function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0 || typeof window === "undefined") return;

  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers.map((header) => csvEscape(row[header])).join(",")
  );

  const csvContent = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCustomCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>
): void {
  if (rows.length === 0 || typeof window === "undefined") return;

  const lines = rows.map((row) =>
    row.map((cell) => csvEscape(cell)).join(",")
  );

  const csvContent = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
