/**
 * Datums-/Uhrzeit-Parsing für deutsche Formate, wie sie auf nuLiga-Seiten
 * üblich sind (z.B. "12.09.2026", "Sa 12.09.2026", "12.09.2026 19:00").
 *
 * Gibt bei Erfolg ISO-Werte zurück (Datum: YYYY-MM-DD, Zeit: HH:mm),
 * sonst `null`. Die Aufrufer entscheiden, ob/wie eine Warnung geloggt wird.
 */

const DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
const TIME_RE = /(\d{1,2})[:.](\d{2})(?:\s*Uhr)?/i;

/** Wandelt "12.09.2026" / "1.9.26" in "2026-09-12" um, sonst null. */
export function parseGermanDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = DATE_RE.exec(input);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000; // "26" -> 2026

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Datum auf Plausibilität prüfen (z.B. 31.02. gibt es nicht).
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isValid) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Wandelt "19:00", "19.00" oder "19:00 Uhr" in "19:00" um, sonst null. */
export function parseGermanTime(input: string | null | undefined): string | null {
  if (!input) return null;
  const match = TIME_RE.exec(input);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Extrahiert Datum UND Zeit aus einem gemeinsamen String, z.B.
 * "12.09.2026 19:00" oder "Sa, 12.09.2026 - 19:00 Uhr".
 */
export function parseGermanDateTime(input: string | null | undefined): {
  date: string | null;
  time: string | null;
} {
  return {
    date: parseGermanDate(input),
    time: parseGermanTime(input),
  };
}
