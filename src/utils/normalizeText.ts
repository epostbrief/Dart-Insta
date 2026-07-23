/**
 * Text-Normalisierung für alles, was aus HTML-Zellen extrahiert wird.
 * Cheerio dekodiert HTML-Entities beim Auslesen von .text() bereits
 * automatisch — hier kümmern wir uns um Whitespace, unsichtbare Zeichen
 * und Vereinheitlichung.
 */

/**
 * Trimmt, entfernt Mehrfach-Leerzeichen/Zeilenumbrüche und unsichtbare
 * Steuerzeichen (z.B. non-breaking space, zero-width space), die auf
 * liga.nu-Seiten gelegentlich in Tabellenzellen vorkommen.
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/ /g, ' ') // non-breaking space -> normales Leerzeichen
    .replace(/[​‌‍﻿]/g, '') // zero-width Zeichen entfernen
    .replace(/\s+/g, ' ')
    .trim();
}

/** Wie normalizeText, gibt aber null statt leerem String zurück. */
export function normalizeTextOrNull(input: string | null | undefined): string | null {
  const normalized = normalizeText(input);
  return normalized.length > 0 ? normalized : null;
}

/** Prüft, ob eine Tabellenzeile nach der Normalisierung faktisch leer ist. */
export function isBlankRow(cells: string[]): boolean {
  return cells.every((cell) => normalizeText(cell).length === 0);
}
