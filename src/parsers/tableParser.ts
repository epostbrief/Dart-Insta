/**
 * Parser für die öffentliche Tabellen-Seite einer Liga.
 *
 * Erkennt die Tabelle generisch über Kopfzeilen-Begriffe wie "Platz",
 * "Mannschaft", "Spiele", "S"/"U"/"N", "Punkte", "Diff", "Legs", "Sets".
 *
 * NACHJUSTIERUNG (nach erstem echten Testlauf prüfen):
 * - Manche Ligen zeigen Sets/Legs/Games gar nicht an (nur Punkte + Diff).
 *   Das ist kein Fehler — die entsprechenden Felder bleiben dann `null`.
 * - Einzelbuchstaben-Header ("S", "U", "N") sind mehrdeutig; falls eine
 *   Liga stattdessen ausgeschriebene Header nutzt ("Siege", "Unentschieden",
 *   "Niederlagen"), sind beide Varianten in HEADER_SYNONYMS abgedeckt.
 *   Sollte eine Liga rein numerische/abgekürzte Header verwenden, die hier
 *   nicht abgedeckt sind, bitte HEADER_SYNONYMS um die exakten Begriffe
 *   aus dem gespeicherten Raw-HTML (data/raw) ergänzen.
 */
import * as cheerio from 'cheerio';
import type { StandingEntry } from '../models/standing.js';
import type { ParseResult } from '../models/common.js';
import { findTableByHeaders, dataRows, cellTexts, parseIntOrNull } from './tableUtils.js';
import { normalizeTextOrNull, isBlankRow } from '../utils/normalizeText.js';
import { buildId } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

const HEADER_SYNONYMS: Record<string, string[]> = {
  position: ['platz', 'pl.', 'rang'],
  team: ['mannschaft', 'verein', 'team'],
  matchesPlayed: ['spiele', 'sp.'],
  // Einzelbuchstaben-Header ("S", "U", "N") werden von headerCellMatches()
  // in tableUtils.ts nur EXAKT verglichen, nie als Teilstring — daher hier
  // ohne Leerzeichen-Padding, das würde nach der Normalisierung nie treffen.
  wins: ['siege', 's'],
  draws: ['unentschieden', 'u'],
  losses: ['niederlagen', 'n'],
  points: ['punkte', 'pkt'],
  setsRatio: ['sets'],
  legsRatio: ['legs'],
  gamesRatio: ['games'],
  difference: ['diff'],
};

export interface TableParseContext {
  teamId: string;
  season: string;
  leagueName: string | null;
  originalUrl: string;
}

/** Zerlegt "45:23" oder "45-23" in [for, against]. */
function splitRatio(input: string | null): [number | null, number | null] {
  if (!input) return [null, null];
  const match = /(-?\d+)\s*[:\-]\s*(-?\d+)/.exec(input);
  if (!match) return [null, null];
  return [Number.parseInt(match[1] ?? '', 10), Number.parseInt(match[2] ?? '', 10)];
}

export function parseStandings(html: string, ctx: TableParseContext): ParseResult<StandingEntry> {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  // Header-Text wird in tableUtils bereits kleingeschrieben verglichen; die
  // Leerzeichen-Varianten (" s ") helfen, einzelne Buchstaben nicht versehentlich
  // in Fließtext-Headern zu matchen.
  const found = findTableByHeaders($, HEADER_SYNONYMS, 3);

  if (!found) {
    const msg = `Keine Tabelle anhand der Spaltenüberschriften erkannt (${ctx.originalUrl}). Ggf. Header-Synonyme in tableParser.ts anpassen.`;
    warnings.push(msg);
    logger.warn(msg);
    return { items: [], warnings, availability: 'missing' };
  }

  const now = new Date().toISOString();
  const items: StandingEntry[] = [];

  dataRows($, found.table).forEach((row, index) => {
    const cells = cellTexts($, row);
    if (isBlankRow(cells)) return;

    const get = (field: string): string | null => {
      for (const [colIndex, mappedField] of found.columns.entries()) {
        if (mappedField === field) return cells[colIndex] ?? null;
      }
      return null;
    };

    const teamName = normalizeTextOrNull(get('team'));
    if (!teamName) {
      warnings.push(`Zeile ${index + 1}: Mannschaftsname nicht bestimmbar, übersprungen.`);
      return;
    }

    const [setsFor, setsAgainst] = splitRatio(get('setsRatio'));
    const [legsFor, legsAgainst] = splitRatio(get('legsRatio'));
    const [gamesFor, gamesAgainst] = splitRatio(get('gamesRatio'));

    items.push({
      id: buildId(ctx.teamId, ctx.season, teamName),
      teamId: ctx.teamId,
      season: ctx.season,
      leagueName: ctx.leagueName,
      position: parseIntOrNull(get('position')),
      teamName,
      matchesPlayed: parseIntOrNull(get('matchesPlayed')),
      wins: parseIntOrNull(get('wins')),
      draws: parseIntOrNull(get('draws')),
      losses: parseIntOrNull(get('losses')),
      points: parseIntOrNull(get('points')),
      setsFor,
      setsAgainst,
      legsFor,
      legsAgainst,
      gamesFor,
      gamesAgainst,
      difference: parseIntOrNull(get('difference')),
      originalUrl: ctx.originalUrl,
      crawledAt: now,
    });
  });

  const availability = items.length === 0 ? 'missing' : warnings.length > 0 ? 'partial' : 'complete';
  logger.info(`Tabelle geparst: ${items.length} Zeilen, ${warnings.length} Warnungen`, {
    url: ctx.originalUrl,
  });

  return { items, warnings, availability };
}
