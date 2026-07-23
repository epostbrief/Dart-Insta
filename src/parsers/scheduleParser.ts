/**
 * Parser für die öffentliche Spielplan-Seite einer Mannschaft.
 *
 * Sucht generisch nach einer Tabelle, deren Kopfzeile Begriffe wie
 * "Datum", "Zeit", "Heimmannschaft", "Gastmannschaft", "Begegnung",
 * "Spielort" oder "Spieltag" enthält (siehe tableUtils.findTableByHeaders).
 * Das ist absichtlich robuster als feste CSS-Klassen, weil sich das
 * liga.nu-Layout zwischen Ligen/Saisons leicht unterscheiden kann.
 *
 * NACHJUSTIERUNG (nach erstem echten Testlauf prüfen):
 * - Manche nuLiga-Installationen zeigen Heim/Gast in EINER Spalte
 *   "Begegnung" ("Verein A - Verein B") statt in zwei getrennten Spalten.
 *   Beide Varianten werden unterstützt (siehe splitFixture unten).
 * - Falls Datum und Uhrzeit in einer gemeinsamen Spalte stehen, wird das
 *   über parseGermanDate/parseGermanTime auf demselben Zellentext bereits
 *   abgedeckt (beide Funktionen extrahieren unabhängig voneinander).
 */
import * as cheerio from 'cheerio';
import type { ScheduleEntry } from '../models/schedule.js';
import type { ParseResult } from '../models/common.js';
import { findTableByHeaders, dataRows, cellTexts, normalizeStatus } from './tableUtils.js';
import { normalizeTextOrNull, isBlankRow } from '../utils/normalizeText.js';
import { parseGermanDate, parseGermanTime } from '../utils/parseDate.js';
import { buildId } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

const HEADER_SYNONYMS: Record<string, string[]> = {
  matchDay: ['spieltag'],
  matchNumber: ['spielnr', 'nr.', 'nummer'],
  date: ['datum', 'tag'],
  time: ['zeit', 'uhrzeit'],
  home: ['heimmannschaft', 'heim'],
  away: ['gastmannschaft', 'gast', 'auswärts', 'auswarts'],
  fixture: ['begegnung', 'paarung'],
  venue: ['spielort', 'ort', 'halle'],
  result: ['ergebnis', 'resultat'],
  status: ['status'],
};

export interface ScheduleParseContext {
  teamId: string;
  teamName: string;
  /** Name des Vereins/Teams exakt wie er auf liga.nu erscheint (config.clubTeamName). */
  clubTeamName: string;
  season: string;
  leagueName: string | null;
  originalUrl: string;
}

/** Trennt "Verein A - Verein B" bzw. "Verein A vs. Verein B" in zwei Namen. */
function splitFixture(fixture: string): [string, string] | null {
  const parts = fixture.split(/\s[-–]\s|\svs\.?\s/i);
  if (parts.length !== 2) return null;
  const home = parts[0]?.trim();
  const away = parts[1]?.trim();
  if (!home || !away) return null;
  return [home, away];
}

/**
 * Grobe Übereinstimmungsprüfung, ob ein aus der Tabelle gelesener
 * Mannschaftsname dem konfigurierten `clubTeamName` entspricht.
 */
function isSameTeam(candidate: string, clubTeamName: string): boolean {
  const a = candidate.toLowerCase();
  const b = clubTeamName.toLowerCase();
  return a.includes(b) || b.includes(a);
}

export function parseSchedule(html: string, ctx: ScheduleParseContext): ParseResult<ScheduleEntry> {
  const $ = cheerio.load(html);
  const warnings: string[] = [];

  if (!ctx.clubTeamName || ctx.clubTeamName.startsWith('HIER_')) {
    warnings.push(
      `"clubTeamName" ist nicht konfiguriert — Heim/Auswärts-Erkennung und Gegner-Feld sind für ${ctx.teamName} unzuverlässig. Bitte in teams.config.ts den exakten Vereinsnamen wie auf liga.nu eintragen.`,
    );
  }

  const found = findTableByHeaders($, HEADER_SYNONYMS, 2);

  if (!found) {
    const msg = `Keine Spielplan-Tabelle anhand der Spaltenüberschriften erkannt (${ctx.originalUrl}). Ggf. Header-Synonyme in scheduleParser.ts anpassen.`;
    warnings.push(msg);
    logger.warn(msg);
    return { items: [], warnings, availability: 'missing' };
  }

  const now = new Date().toISOString();
  const items: ScheduleEntry[] = [];

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
      if (split) {
        [homeTeam, awayTeam] = split;
      }
    }

    if (!homeTeam || !awayTeam) {
      warnings.push(`Zeile ${index + 1}: Heim-/Gastmannschaft nicht bestimmbar, übersprungen.`);
      return;
    }

    const dateRaw = get('date');
    const date = parseGermanDate(dateRaw);
    if (dateRaw && !date) {
      warnings.push(`Zeile ${index + 1}: Datum "${dateRaw}" konnte nicht geparst werden.`);
    }

    const time = parseGermanTime(get('time') ?? dateRaw);
    const isHomeGame = isSameTeam(homeTeam, ctx.clubTeamName);
    const opponent = isHomeGame ? awayTeam : homeTeam;
    const status = normalizeStatus(get('status') ?? get('result'), Boolean(date));

    if (!date) {
      logger.warn(`Spielplan: Datum fehlt in Zeile ${index + 1} von ${ctx.originalUrl}`);
    }

    items.push({
      id: buildId(ctx.teamId, date ?? `row${index}`, opponent),
      teamId: ctx.teamId,
      teamName: ctx.teamName,
      season: ctx.season,
      leagueName: ctx.leagueName,
      matchDay: normalizeTextOrNull(get('matchDay')),
      matchNumber: normalizeTextOrNull(get('matchNumber')),
      date,
      time,
      homeTeam,
      awayTeam,
      opponent,
      isHomeGame,
      venue: normalizeTextOrNull(get('venue')),
      status,
      originalUrl: ctx.originalUrl,
      crawledAt: now,
      updatedAt: now,
    });
  });

  const availability = items.length === 0 ? 'missing' : warnings.length > 0 ? 'partial' : 'complete';
  logger.info(`Spielplan geparst: ${items.length} Einträge, ${warnings.length} Warnungen`, {
    url: ctx.originalUrl,
  });

  return { items, warnings, availability };
}
