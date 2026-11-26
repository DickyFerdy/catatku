export const JAKARTA_TIMEZONE = "Asia/Jakarta";

/**
 * Mengonversi input tanggal/waktu (ISO UTC atau lokal Asia/Jakarta) ke ISO 8601 UTC.
 * Mengembalikan null jika format tidak valid.
 */
export function normalizeToUtcIso(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let normalizedInput = trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    normalizedInput = `${trimmed}T00:00:00+07:00`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    normalizedInput = `${trimmed}:00+07:00`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    normalizedInput = `${trimmed}+07:00`;
  }

  const ms = Date.parse(normalizedInput);
  if (Number.isNaN(ms)) {
    return null;
  }

  return new Date(ms).toISOString();
}

/**
 * Mengembalikan waktu saat ini dalam format YYYY-MM-DDTHH:mm di zona Asia/Jakarta.
 */
export function nowJakartaDateTimeInput(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: JAKARTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
