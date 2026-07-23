/**
 * Parser für die öffentliche Ergebnis-Seite einer Mannschaft/Liga.
 *
 * Erkennt die Ergebnis-Tabelle generisch über Kopfzeilen wie "Heim",
 * "Gast", "Ergebnis", "Bericht"/"Details".
 *
 * Einzelergebnisse (PlayerResult):
 * Auf vielen nuLiga-Installationen stehen Einzelergebnisse NICHT in der
 * Ergebnis-Übersichtstabelle, sondern auf einer separaten, über den
 * "Bericht"/"Details"-Link verlinkten Unterseite. Um den Crawler nicht
 * unnötig aggressiv zu machen (ein zusätzlicher Request PRO Spiel, siehe
 * Regel "keine aggressiven Crawls"), lädt dieser Parser diese Unterseiten
 * in der aktuellen Grundgerüst-Version NICHT automatisch nach.
 *
 * Stattdessen wird best-effort versucht, Einzelergebnisse direkt aus der
 * Zeile selbst zu extrahieren (falls liga.nu sie z.B. in einer
 * eingebetteten Detail-Zeile "Name : Name  3:1" anzeigt). Wird nichts
 * Eindeutiges gefunden, bleibt `players` einfach leer — das
 * Mannschaftsergebnis wird trotzdem gespeichert (wie in Aufgabenstellung
 * Abschnitt 6 gefordert).
 *
 * BEKANNTE EINSCHRÄNKUNG / TODO: Ein optionaler zweiter Crawl-Schritt,
 * der pro Spiel die Detailseite lädt (mit eigenem Rate-Limit-Abstand),
 * kann hier später ergänzt werden, sobald das echte HTML bekannt ist.
 * Siehe README, Abschnitt "Bekannte Grenzen".
 */
import * as cheerio from 'cheerio';
import type { MatchResult, PlayerResult } from '../models/result.js';
import type { ParseResult } from '../models/common.js';
import {
  findTableByHeaders,
  dataRows,
  cellTexts,
  firstLink,
  toAbsoluteUrl,
  normalizeStatus,
} from './tableUtils.js';
import { normalizeTextOrNull, normalizeText, isBlankRow } from '../utils/normalizeText.js';
import { parseGermanDate } from '../utils/parseDate.js';
import { buildId } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

const HEADER_SYNONYMS: Record<string, string[]> = {
  date: ['datum'],
  home: ['heimmannschaft', 'heim'],
  away: ['gastmannschaft', 'gast'],
  fixture: ['begegnung', 'paarung'],
  result: ['ergebnis', 'resultat'],
  details: ['bericht', 'details', 'einzelergebnisse'],
  matchNumber: ['spielnr', 'nr.'],
};

/** Erkennt Zeilen wie "Max Mustermann : Erika Musterfrau   3:1". */
const PLAYER_LINE_RE = /([\p{L} .'-]{2,40})\s*:\s*([\p{L} .'-]{2,40})\s+(\d+)\s*[:\-]\s*(\d+)/gu;

export interface ResultsParseContext {
  teamId: string;
  season: string;
  leagueName: string | null;
  originalUrl: string;
}

function splitFixture(fixture: string): [string, string] | null {
  const parts = fixture.split(/\s[-–]\s|\svs\.?\s/i);
  if (parts.length !== 2) return null;
  const home = parts[0]?.trim();
  const away = parts[1]?.trim();
  if (!home || !away) return null;
  return [home, away];
}

function splitScore(input: string | null): [number | null, number | null] {
  if (!input) return [null, null];
  const match = /(\d+)\s*[:\-]\s*(\d+)/.exec(input);
  if (!match) return [null, null];
  return [Number.parseInt(match[1] ?? '', 10), Number.parseInt(match[2] ?? '', 10)];
}

/**
 * Best-effort-Extraktion von Einzelergebnissen direkt aus dem Zeilentext.
 * Siehe Modul-Kommentar oben — liefert bewusst eine leere Liste statt
 * einer Exception, wenn nichts Eindeutiges gefunden wird.
 */
function extractInlinePlayerResults(
  rowText: string,
  matchResultId: string,
  homeTeam: string,
  awayTeam: string,
  originalUrl: string,
): PlayerResult[] {
  const players: PlayerResult[] = [];
  try {
    const text = normalizeText(rowText);
    let match: RegExpExecArray | null;
    PLAYER_LINE_RE.lastIndex = 0;
    while ((match = PLAYER_LINE_RE.exec(text)) !== null) {
      const [, playerName, opponentName, setsHome, setsAway] = match;
      if (!playerName || !opponentName) continue;
      players.push({
        id: buildId(matchResultId, playerName, opponentName),
        matchResultId,
        playerName: playerName.trim(),
        teamName: homeTeam,
        opponentName: opponentName.trim(),
        result: `${setsHome}:${setsAway}`,
        sets: `${setsHome}:${setsAway}`,
        legs: null,
        points: null,
        originalUrl,
      });
    }
  } catch (err) {
    logger.debug(`Inline-Einzelergebnisse für ${matchResultId} nicht parsebar`, {
      error: (err as Error).message,
    });
  }
  void awayTeam; // aktuell nur zur Dokumentation der verfügbaren Kontextdaten
  return players;
}

export function parseResults(html: string, ctx: ResultsParseContext): ParseResult<MatchResult> {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  const found = findTableByHeaders($, HEADER_SYNONYMS, 2);

  if (!found) {
    const msg = `Keine Ergebnis-Tabelle anhand der Spaltenüberschriften erkannt (${ctx.originalUrl}). Ggf. Header-Synonyme in resultsParser.ts anpassen.`;
    warnings.push(msg);
    logger.warn(msg);
    return { items: [], warnings, availability: 'missing' };
  }

  const now = new Date().toISOString();
  const items: MatchResult[] = [];

  dataRows($, found.table).forEach((row, index) => {
    const cells = cellTexts($, row);
    if (isBlankRow(cells)) return;

    const get = (field: string): string | null => {
      for (const [colIndex, mappedField] of found.columns.entries()) {
        if (mappedField === field) return cells[colIndex] ?? null;
      }
      return null;
    };

    let homeTeam = normalizeTextOrNull(get('home'));
    let awayTeam = normalizeTextOrNull(get('away'));
    if (!homeTeam || !awayTeam) {
      const fixture = get('fixture');
      const split = fixture ? splitFixture(fixture) : null;
      if (split) [homeTeam, awayTeam] = split;
    }

    if (!homeTeam || !awayTeam) {
      warnings.push(`Zeile ${index + 1}: Heim-/Gastmannschaft nicht bestimmbar, übersprungen.`);
      return;
    }

    const dateRaw = get('date');
    const date = parseGermanDate(dateRaw);
    const resultRaw = get('result');
    const [homeScore, awayScore] = splitScore(resultRaw);
    const status = normalizeStatus(resultRaw, Boolean(date));

    let winner: 'home' | 'away' | 'draw' | null = null;
    if (homeScore !== null && awayScore !== null) {
      winner = homeScore === awayScore ? 'draw' : homeScore > awayScore ? 'home' : 'away';
    }

    const detailsHref = firstLink(row);
    const detailsUrl = toAbsoluteUrl(detailsHref, ctx.originalUrl);
    const matchId = buildId(ctx.teamId, date ?? `row${index}`, homeTeam, awayTeam);

    let players: PlayerResult[] = [];
    try {
      players = extractInlinePlayerResults(cells.join(' | '), matchId, homeTeam, awayTeam, ctx.originalUrl);
    } catch {
      warnings.push(`Einzelergebnisse für Spiel ${matchId} übersprungen — Mannschaftsergebnis bleibt erhalten.`);
    }

    items.push({
      id: matchId,
      teamId: ctx.teamId,
      season: ctx.season,
      leagueName: ctx.leagueName,
      matchNumber: normalizeTextOrNull(get('matchNumber')),
      date,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      winner,
      status,
      detailsUrl,
      originalUrl: ctx.originalUrl,
      crawledAt: now,
      ...(players.length > 0 ? { players } : {}),
    });
  });

  const availability = items.length === 0 ? 'missing' : warnings.length > 0 ? 'partial' : 'complete';
  logger.info(`Ergebnisse geparst: ${items.length} Spiele, ${warnings.length} Warnungen`, {
    url: ctx.originalUrl,
  });

  return { items, warnings, availability };
}
