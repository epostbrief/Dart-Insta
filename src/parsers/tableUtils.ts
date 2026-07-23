/**
 * Gemeinsame Hilfsfunktionen für alle Tabellen-Parser (Spielplan, Tabelle,
 * Ergebnisse). liga.nu-Seiten können sich strukturell leicht unterscheiden
 * (unterschiedliche CSS-Klassen je Liga/Saison) — deshalb wird hier NICHT
 * anhand von Klassennamen gesucht, sondern anhand der Spaltenüberschriften
 * (siehe findTableByHeaders). Das ist robuster gegen Layout-Änderungen.
 *
 * Hinweis zur Nachjustierung: Sollte sich nach dem ersten echten Testlauf
 * herausstellen, dass liga.nu z.B. verschachtelte <div>-Tabellen statt
 * echter <table>-Elemente verwendet, muss hier die Selektor-Logik ergänzt
 * werden (siehe README, Abschnitt "Selektor-Nachjustierung").
 */
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { normalizeText } from '../utils/normalizeText.js';
import type { MatchStatus } from '../models/common.js';

const SCORE_RE = /^\s*\d+\s*[:-]\s*\d+\s*$/;

/**
 * Leitet einen normalisierten {@link MatchStatus} aus einer beliebigen
 * Statustext-/Ergebnis-Zelle ab. Erkennt gängige deutsche Begriffe von
 * liga.nu; alles Unbekannte wird als "unknown" markiert statt geraten.
 */
export function normalizeStatus(rawText: string | null | undefined, hasDate: boolean): MatchStatus {
  const text = normalizeText(rawText).toLowerCase();

  if (!text) return hasDate ? 'scheduled' : 'unknown';
  if (/(verlegt|verschoben)/.test(text)) return 'postponed';
  if (/(abgesagt|ausgefallen|annulliert|kampflos)/.test(text)) return 'cancelled';
  if (SCORE_RE.test(text)) return 'completed';
  if (/(beendet|gespielt)/.test(text)) return 'completed';
  if (/(geplant|offen)/.test(text)) return 'scheduled';
  return hasDate ? 'scheduled' : 'unknown';
}

export interface FoundTable {
  table: Cheerio<AnyNode>;
  /** Spalten-Index -> erkanntes logisches Feld (z.B. 2 -> "date"). */
  columns: Map<number, string>;
}

/**
 * Vergleicht einen (bereits normalisierten, kleingeschriebenen) Header-
 * Zellentext mit einem Synonym. Kurze Abkürzungen (z.B. "S", "U", "N"
 * für Siege/Unentschieden/Niederlagen) werden nur EXAKT verglichen,
 * damit z.B. "S" nicht versehentlich als Teil von "Spiele" erkannt wird.
 * Längere Begriffe (>= 3 Zeichen) dürfen auch als Teilstring vorkommen,
 * z.B. "Punkte" in "Gesamtpunkte".
 */
function headerCellMatches(cellText: string, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  if (cellText === kw) return true;
  if (kw.length >= 3 && cellText.includes(kw)) return true;
  return false;
}

/**
 * Durchsucht alle <table>-Elemente der Seite und wählt diejenige aus,
 * deren erste Zeile (Header) am meisten der übergebenen Synonym-Liste
 * entspricht. `synonyms` ordnet einem logischen Feldnamen mögliche
 * deutsche Spaltenüberschriften zu (Groß-/Kleinschreibung egal).
 */
export function findTableByHeaders(
  $: CheerioAPI,
  synonyms: Record<string, string[]>,
  minMatches = 2,
): FoundTable | null {
  let best: (FoundTable & { score: number }) | null = null;

  $('table').each((_, tableEl) => {
    const table = $(tableEl);
    const headerRow = table.find('tr').first();
    const headerCells = headerRow.find('th, td');
    if (headerCells.length === 0) return;

    const columns = new Map<number, string>();
    headerCells.each((colIndex, cellEl) => {
      const text = normalizeText($(cellEl).text()).toLowerCase();
      if (!text) return;
      for (const [field, keywords] of Object.entries(synonyms)) {
        if (columns.has(colIndex)) break;
        if (keywords.some((kw) => headerCellMatches(text, kw))) {
          columns.set(colIndex, field);
        }
      }
    });

    if (columns.size >= minMatches && (!best || columns.size > best.score)) {
      best = { table, columns, score: columns.size };
    }
  });

  return best;
}

/** Liefert alle Datenzeilen einer Tabelle (ohne die erste/Header-Zeile). */
export function dataRows($: CheerioAPI, table: Cheerio<AnyNode>): Cheerio<AnyNode>[] {
  return table
    .find('tr')
    .toArray()
    .slice(1)
    .map((row) => $(row));
}

/** Extrahiert den normalisierten Text jeder Zelle einer Zeile. */
export function cellTexts($: CheerioAPI, row: Cheerio<AnyNode>): string[] {
  return row
    .find('td, th')
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
}

/** Findet den ersten Link (href) innerhalb einer Zeile, falls vorhanden. */
export function firstLink(row: Cheerio<AnyNode>): string | null {
  const href = row.find('a').first().attr('href');
  return href ?? null;
}

/** Macht eine relative URL anhand der Basis-URL absolut. */
export function toAbsoluteUrl(href: string | null, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

/** Parst eine Ganzzahl aus einem String, gibt null zurück wenn nicht möglich. */
export function parseIntOrNull(input: string | null | undefined): number | null {
  if (!input) return null;
  const match = /-?\d+/.exec(input.replace(/\./g, ''));
  if (!match) return null;
  const value = Number.parseInt(match[0], 10);
  return Number.isNaN(value) ? null : value;
}
