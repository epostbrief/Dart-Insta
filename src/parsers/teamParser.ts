/**
 * Baut den TeamRecord für eine Mannschaft aus der Konfiguration plus
 * (best-effort) der öffentlichen Team-Übersichtsseite.
 *
 * Der Liganame wird heuristisch aus Überschriften/Titel der
 * Übersichtsseite abgeleitet (sucht nach typischen Liga-Begriffen wie
 * "Bezirksliga", "Kreisklasse" etc.). Gelingt das nicht, bleibt
 * `leagueName` null und es wird eine Warnung geloggt — der Rest des
 * Crawls läuft trotzdem normal weiter.
 *
 * NACHJUSTIERUNG: Sollte die Übersichtsseite die Liga an anderer Stelle
 * zeigen (z.B. in einer Tabelle statt Überschrift), bitte LEAGUE_HINTS
 * bzw. die candidates-Liste unten erweitern.
 */
import * as cheerio from 'cheerio';
import type { TeamConfig } from '../models/team.js';
import type { TeamRecord } from '../models/team.js';
import { normalizeTextOrNull } from '../utils/normalizeText.js';
import { buildId } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

const LEAGUE_HINTS = [
  'liga',
  'klasse',
  'kreisliga',
  'kreisklasse',
  'bezirksliga',
  'bezirksklasse',
  'verbandsliga',
  'landesliga',
  'oberliga',
  'bundesliga',
];

function looksLikeLeagueName(text: string | null): text is string {
  if (!text) return false;
  const lower = text.toLowerCase();
  return LEAGUE_HINTS.some((hint) => lower.includes(hint));
}

/**
 * @param html Roh-HTML der Team-Übersichtsseite (`config.ligaNuTeamUrl`),
 *             oder `null` wenn diese Seite nicht geladen werden konnte —
 *             in dem Fall wird nur aus der Konfiguration gebaut.
 */
export function parseTeamOverview(html: string | null, config: TeamConfig): TeamRecord {
  const now = new Date().toISOString();
  let leagueName: string | null = null;

  if (html) {
    try {
      const $ = cheerio.load(html);
      const candidates = [
        $('h1').first().text(),
        $('h2').first().text(),
        $('.breadcrumb, .breadcrumbs, .path').first().text(),
        $('title').first().text(),
      ];

      for (const candidate of candidates) {
        const normalized = normalizeTextOrNull(candidate);
        if (looksLikeLeagueName(normalized)) {
          leagueName = normalized;
          break;
        }
      }

      if (!leagueName) {
        logger.warn(
          `Liganame für "${config.displayName}" nicht automatisch erkannt — ggf. LEAGUE_HINTS in teamParser.ts erweitern, oder Liga manuell nachtragen.`,
        );
      }
    } catch (err) {
      logger.warn(`Team-Übersichtsseite für "${config.displayName}" konnte nicht geparst werden`, {
        error: (err as Error).message,
      });
    }
  }

  return {
    id: buildId(config.id, config.season),
    teamId: config.id,
    name: config.name,
    displayName: config.displayName,
    season: config.season,
    leagueName,
    scheduleUrl: config.scheduleUrl,
    tableUrl: config.tableUrl,
    resultsUrl: config.resultsUrl,
    originalUrl: config.ligaNuTeamUrl,
    crawledAt: now,
  };
}
